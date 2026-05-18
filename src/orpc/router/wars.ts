import { db } from '#/db/index.ts'
import { os } from '@orpc/server'
import { z } from 'zod'
import { battles, wars } from '#/db/schema.ts'
import type { SQL } from 'drizzle-orm'
import { and, eq, ilike, sql } from 'drizzle-orm'

export const getWar = os
  .input(z.object({ warId: z.string() }))

  .handler(async ({ input }) => {
    const war = await db.query.wars.findFirst({
      where: {
        id: Number(input.warId),
      },
      with: {
        battles: {
          with: {
            country: true,
            loser: true,
            participants: true,
            winner: true,
          },
        },
      },
    })

    return war
  })

export const getBattle = os
  .input(z.object({ battleId: z.string() }))

  .handler(async ({ input }) => {
    const battle = await db.query.battles.findFirst({
      where: {
        id: Number(input.battleId),
      },
      with: {
        country: true,
        loser: true,
        participants: true,
        winner: true,
        war: true,
      },
    })

    return battle
  })

export const listAllBattles = os
  .input(z.object({ year: z.string().optional() }))
  .handler(async ({ input: { year } }) => {
    return db.query.battles.findMany({
      where: {
        year: year ? Number(year) : undefined,
      },
      with: {
        country: true,
        loser: true,
        participants: true,
        winner: true,
        war: true,
      },
    })
  })

export const homePage = os
  .input(
    z.object({
      page: z.number().optional(),
      warName: z.string().optional(),
    }),
  )

  .handler(async ({ input: { page = 1, warName } }) => {
    const filters: SQL[] = []
    if (warName) filters.push(ilike(wars.name, `%${warName}%`))

    const perPage = 12

    // Get total count first
    const totalWars = await db.$count(wars, and(...filters))
    const totalPages = Math.max(1, Math.ceil(totalWars / perPage))
    const safePage = Math.min(page, totalPages)

    const data = await db
      .select({
        id: wars.id,
        name: wars.name,
        battle_count: sql<number>`count(${battles.id})`,
      })
      .from(wars)
      .where(and(...filters))
      .leftJoin(battles, eq(battles.warId, wars.id))
      .groupBy(wars.id, wars.name)
      .orderBy(wars.id)
      .limit(perPage)
      .offset((safePage - 1) * perPage)

    return {
      items: data.map((w) => ({
        id: w.id,
        name: w.name,
        battle_count: w.battle_count,
      })),
      total: totalWars,
      totalPages,
      currentPage: safePage,
    }
  })
