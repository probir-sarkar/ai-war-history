import { getDb } from '#/db/index.ts'
import { battles, wars } from '#/db/schema.ts'
import { and, eq, ilike, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { BattleWithWar } from '#/orpc/schema.ts'
import { fetchBattles } from './battles.ts'

/* War reads. fetchWarsPage is a single round-trip (the count rides
   along as a window function); fetchWarWithBattles is two. */

export interface WarWithBattles {
  id: number
  name: string
  battles: BattleWithWar[]
}

/** A war plus every one of its battles, oldest first. */
export async function fetchWarWithBattles(
  id: number,
): Promise<WarWithBattles | null> {
  const db = getDb()
  const rows = await db
    .select({ id: wars.id, name: wars.name })
    .from(wars)
    .where(eq(wars.id, id))
    .limit(1)

  const war = rows.at(0)
  if (!war) return null

  const { items } = await fetchBattles({
    where: eq(battles.warId, war.id),
    limit: 1_000_000,
    offset: 0,
  })

  return { id: war.id, name: war.name, battles: items }
}

export interface WarsPage {
  items: { id: number; name: string; battle_count: number }[]
  total: number
  totalPages: number
  currentPage: number
}

/** Wars (optionally filtered by name), paginated with battle counts. */
export async function fetchWarsPage(opts: {
  page: number
  perPage: number
  warName?: string
}): Promise<WarsPage> {
  const db = getDb()
  const filters: SQL[] = []
  if (opts.warName) filters.push(ilike(wars.name, `%${opts.warName}%`))

  const page = (p: number) =>
    db
      .select({
        id: wars.id,
        name: wars.name,
        battle_count: sql<number>`count(${battles.id})`.mapWith(Number),
        // count(*) over() is evaluated per group across the whole
        // filtered set, so the total arrives with the page.
        total: sql<number>`count(*) over ()`.mapWith(Number),
      })
      .from(wars)
      .leftJoin(battles, eq(battles.warId, wars.id))
      .where(and(...filters))
      .groupBy(wars.id, wars.name)
      .orderBy(wars.id)
      .limit(opts.perPage)
      .offset((p - 1) * opts.perPage)

  let rows = await page(opts.page)

  // A page past the end returns no rows (so no window total); fall back
  // to the first page.
  if (rows.length === 0 && opts.page > 1) {
    rows = await page(1)
  }

  const total = rows.at(0)?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / opts.perPage))
  const currentPage = rows.length === 0 ? 1 : Math.min(opts.page, totalPages)

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
}
