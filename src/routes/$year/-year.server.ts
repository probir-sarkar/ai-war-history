import { db } from '#/db/index.ts'

export async function getBattles(year: string) {
  return db.query.battles.findMany({
    where: {
      year: Number(year),
    },
  })
}
