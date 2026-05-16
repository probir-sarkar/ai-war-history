import { db } from '#/db/index.ts'
import { createServerFn } from '@tanstack/react-start';

export const getBattles = createServerFn()
  .validator((data: { year: number }) => data)
  .handler(async ({ data }) => {
    return db.query.battles.findMany({
      where: {
        year: data.year,
      },
    })
  })
