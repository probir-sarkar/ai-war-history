import { db } from '#/db/index.ts'
import { os } from '@orpc/server'
import { z } from 'zod'
import { cacheMiddleware } from '../middleware/cache-middleware'
import { wars, battles } from '#/db/schema.ts'

export const listWars = os
  .input(
    z.object({
      q: z.string().optional(),
      year: z.number().optional(),
      page: z.number().optional(),
      pageSize: z.number().optional(),
    }),
  )
  .use(cacheMiddleware({ ttl: 60 * 60 }))
  .handler(async ({ input }) => {
    const page = input.page ?? 1
    const pageSize = input.pageSize ?? 12

    const wars = await db.query.wars.findMany({
      with: {
        battles: {
          with: {
            country: true,
            loser: true,
            participants: true,
            theatres: true,
            winner: true,
          },
        },
      },
    })

    // Filter on server
    let filtered = wars.filter((w) => {
      // Filter by name search
      if (input.q && !w.name.toLowerCase().includes(input.q.toLowerCase())) {
        return false
      }

      // Filter by battle year
      if (input.year !== undefined) {
        const hasBattleInYear = w.battles?.some((b) => b.year === input.year)
        if (!hasBattleInYear) return false
      }

      return true
    })

    // Filter battles by year if specified
    if (input.year !== undefined) {
      filtered = filtered.map((w) => ({
        ...w,
        battles: w.battles?.filter((b) => b.year === input.year) ?? [],
      }))
    }

    // Sort by ID
    filtered.sort((a, b) => a.id - b.id)

    // Calculate pagination
    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    const end = start + pageSize
    const paginated = filtered.slice(start, end)

    return {
      items: paginated,
      total,
      totalPages,
      currentPage: safePage,
    }
  })

export const getWar = os
  .input(z.object({ warId: z.string() }))
  .use(cacheMiddleware({ ttl: 60 * 60 }))
  .handler(async ({ input }) => {
    const wars = await db.query.wars.findMany({
      where: (wars, { eq }) => eq(wars.id, Number(input.warId)),
      with: {
        battles: {
          with: {
            country: true,
            loser: true,
            participants: true,
            theatres: true,
            winner: true,
          },
        },
      },
    })

    return wars[0] ?? null
  })

export const getBattle = os
  .input(z.object({ battleId: z.string() }))
  .use(cacheMiddleware({ ttl: 60 * 60 }))
  .handler(async ({ input }) => {
    const battles = await db.query.battles.findMany({
      where: (battles, { eq }) => eq(battles.id, Number(input.battleId)),
      with: {
        country: true,
        loser: true,
        participants: true,
        theatres: true,
        winner: true,
        war: true,
      },
    })

    return battles[0] ?? null
  })

export const listAllBattles = os
  .input(z.object({}).optional())
  .use(cacheMiddleware({ ttl: 60 * 60 }))
  .handler(async () => {
    return db.query.battles.findMany({
      with: {
        country: true,
        loser: true,
        participants: true,
        theatres: true,
        winner: true,
        war: true,
      },
    })
  })
