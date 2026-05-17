import { db } from '#/db/index.ts'
import { os } from '@orpc/server'
import { z } from 'zod'
import { cacheMiddleware } from '../middleware/cache-middleware'

export const listBattles = os
  .input(z.object({ year: z.string() }))
  .use(cacheMiddleware({ ttl: 60 * 60 }))
  .handler(async ({ input: { year } }) => {
    return db.query.battles.findMany({
      where: {
        year: Number(year),
      },
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
