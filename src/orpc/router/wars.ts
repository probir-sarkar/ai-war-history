import { db } from '#/db/index.ts'
import { os } from '@orpc/server'
import { z } from 'zod'
import { cacheMiddleware } from '../middleware/cache-middleware'
import { wars, battles } from '#/db/schema.ts'

export const listWars = os
  .input(
    z.object({
      region: z.string().optional(),
      fromYear: z.number().optional(),
      toYear: z.number().optional(),
    }),
  )
  .use(cacheMiddleware({ ttl: 60 * 60 }))
  .handler(async ({ input }) => {
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

    if (input.region) {
      // Filter by region if we add region field later
    }

    return wars
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
