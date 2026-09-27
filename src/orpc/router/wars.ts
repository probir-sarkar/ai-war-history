import { getDb } from '#/db/index.ts'
import { os } from '@orpc/server'
import { z } from 'zod'
import { battles, wars } from '#/db/schema.ts'
import type { SQL } from 'drizzle-orm'
import { and, eq, ilike, sql } from 'drizzle-orm'

const idParam = z.string().regex(/^\d+$/, 'Must be a numeric id')

/* =========================================================
   SHAPES
========================================================= */

const countrySchema = z.object({
  id: z.number(),
  name: z.string(),
})

const participantSchema = z.object({
  id: z.number(),
  name: z.string(),
})

const warSchema = z.object({
  id: z.number(),
  name: z.string(),
})

const battleColumns = {
  id: z.number(),
  name: z.string(),
  year: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  scale: z.number().nullable(),
  massacre: z.boolean().nullable(),
  theatres: z.array(z.enum(['Air', 'Land', 'Sea'])).nullable(),
  countryId: z.number().nullable(),
  winnerId: z.number().nullable(),
  loserId: z.number().nullable(),
  warId: z.number(),
}

const battleWithRelationsSchema = z.object({
  ...battleColumns,
  country: countrySchema.nullable(),
  winner: countrySchema.nullable(),
  loser: countrySchema.nullable(),
  participants: z.array(participantSchema),
})

const battleWithWarSchema = battleWithRelationsSchema.extend({
  war: warSchema.nullable(),
})

const paginationMeta = {
  total: z.number(),
  totalPages: z.number(),
  currentPage: z.number(),
}

/* =========================================================
   PROCEDURES
========================================================= */

export const getWar = os
  .input(z.object({ warId: idParam }))
  .output(
    z
      .object({
        ...warSchema.shape,
        battles: z.array(battleWithRelationsSchema),
      })
      .nullable()
      .optional(),
  )
  .handler(async ({ input }) => {
    const db = getDb()
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
  .input(z.object({ battleId: idParam }))
  .output(battleWithWarSchema.nullable().optional())
  .handler(async ({ input }) => {
    const db = getDb()
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
  .input(
    z.object({
      year: z.coerce.number().int().optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(24),
    }),
  )
  .output(
    z.object({
      items: z.array(battleWithWarSchema),
      ...paginationMeta,
    }),
  )
  .handler(async ({ input: { year, page, pageSize } }) => {
    const db = getDb()
    const totalBattles = await db.$count(
      battles,
      year !== undefined ? eq(battles.year, year) : undefined,
    )
    const totalPages = Math.max(1, Math.ceil(totalBattles / pageSize))
    const safePage = Math.min(page, totalPages)

    const items = await db.query.battles.findMany({
      where: year !== undefined ? { year } : undefined,
      with: {
        country: true,
        loser: true,
        participants: true,
        war: true,
        winner: true,
      },
      limit: pageSize,
      offset: (safePage - 1) * pageSize,
    })

    return {
      items,
      total: totalBattles,
      totalPages,
      currentPage: safePage,
    }
  })

export const homePage = os
  .input(
    z.object({
      page: z.coerce.number().int().min(1).default(1),
      warName: z.string().optional(),
    }),
  )
  .output(
    z.object({
      items: z.array(
        z.object({
          ...warSchema.shape,
          battle_count: z.number(),
        }),
      ),
      ...paginationMeta,
    }),
  )
  .handler(async ({ input: { page, warName } }) => {
    const db = getDb()
    const filters: SQL[] = []
    if (warName) filters.push(ilike(wars.name, `%${warName}%`))

    const perPage = 12

    // count(*) over() is evaluated per group across the whole filtered set,
    // so the total arrives with the page in a single round-trip.
    const fetchPage = (p: number) =>
      db
        .select({
          id: wars.id,
          name: wars.name,
          battle_count: sql<number>`count(${battles.id})`.mapWith(Number),
          total: sql<number>`count(*) over ()`.mapWith(Number),
        })
        .from(wars)
        .leftJoin(battles, eq(battles.warId, wars.id))
        .where(and(...filters))
        .groupBy(wars.id, wars.name)
        .orderBy(wars.id)
        .limit(perPage)
        .offset((p - 1) * perPage)

    let rows = await fetchPage(page)

    // A page past the end returns no rows (so no window total); fall back
    // to the last valid page.
    if (rows.length === 0 && page > 1) {
      rows = await fetchPage(1)
    }

    const total = rows[0]?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const currentPage = rows.length === 0 ? 1 : Math.min(page, totalPages)

    return {
      items: rows.map((w) => ({
        id: w.id,
        name: w.name,
        battle_count: w.battle_count,
      })),
      total,
      totalPages,
      currentPage,
    }
  })
