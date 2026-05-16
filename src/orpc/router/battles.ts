import { db } from '#/db/index.ts'
import { os } from '@orpc/server'
import * as z from 'zod'

export const listBattles = os
  .input(z.object({ year: z.string() }))
  .handler(async ({ input: { year } }) => {
    return db.query.battles.findMany({
      where: {
        year: Number(year),
      },
    })
  })
