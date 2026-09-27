import { getDb } from '#/db/index.ts'
import {
  battles,
  battlesToParticipants,
  countries,
  participants,
  wars,
} from '#/db/schema.ts'
import { eq, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import type { BattleWithWar } from '#/orpc/schema.ts'

/* Battle reads run as a single round-trip: one join query that
   aggregates participants with json_agg and carries the filtered
   total via a window count. */

const winnerCountries = alias(countries, 'winner_countries')
const loserCountries = alias(countries, 'loser_countries')

const parseJson = (value: unknown) =>
  typeof value === 'string' ? JSON.parse(value) : value

const participantsAgg = sql`coalesce(
  json_agg(json_build_object('id', ${participants.id}, 'name', ${participants.name}))
    filter (where ${participants.id} is not null),
  '[]'::json
)`.mapWith(parseJson)

/** Flat SQL row: battle columns + joined relation columns + window total. */
const battleSelection = {
  id: battles.id,
  name: battles.name,
  year: battles.year,
  latitude: battles.latitude,
  longitude: battles.longitude,
  scale: battles.scale,
  massacre: battles.massacre,
  theatres: battles.theatres,
  countryId: battles.countryId,
  winnerId: battles.winnerId,
  loserId: battles.loserId,
  warId: battles.warId,
  countryRefId: countries.id,
  countryName: countries.name,
  winnerRefId: winnerCountries.id,
  winnerName: winnerCountries.name,
  loserRefId: loserCountries.id,
  loserName: loserCountries.name,
  warRefId: wars.id,
  warName: wars.name,
  total: sql<number>`count(*) over ()`.mapWith(Number),
  participants: participantsAgg,
}

interface BattleRow {
  id: number
  name: string
  year: number
  latitude: number
  longitude: number
  scale: number | null
  massacre: boolean | null
  theatres: ('Air' | 'Land' | 'Sea')[] | null
  countryId: number | null
  winnerId: number | null
  loserId: number | null
  warId: number
  countryRefId: number | null
  countryName: string | null
  winnerRefId: number | null
  winnerName: string | null
  loserRefId: number | null
  loserName: string | null
  warRefId: number | null
  warName: string | null
  total: number
  participants: { id: number; name: string }[]
}

/** Folds a flat joined row back into the nested API shape. */
const toBattle = (row: BattleRow): BattleWithWar => ({
  id: row.id,
  name: row.name,
  year: row.year,
  latitude: row.latitude,
  longitude: row.longitude,
  scale: row.scale,
  massacre: row.massacre,
  theatres: row.theatres,
  countryId: row.countryId,
  winnerId: row.winnerId,
  loserId: row.loserId,
  warId: row.warId,
  country:
    row.countryRefId === null || row.countryName === null
      ? null
      : { id: row.countryRefId, name: row.countryName },
  winner:
    row.winnerRefId === null || row.winnerName === null
      ? null
      : { id: row.winnerRefId, name: row.winnerName },
  loser:
    row.loserRefId === null || row.loserName === null
      ? null
      : { id: row.loserRefId, name: row.loserName },
  war:
    row.warRefId === null
      ? null
      : { id: row.warRefId, name: row.warName ?? '' },
  participants: row.participants,
})

export interface BattlesPage {
  items: BattleWithWar[]
  total: number
  totalPages: number
  currentPage: number
}

export async function fetchBattles(opts: {
  where?: SQL
  limit: number
  offset: number
}): Promise<{ items: BattleWithWar[]; total: number }> {
  const db = getDb()
  const rows: BattleRow[] = await db
    .select(battleSelection)
    .from(battles)
    .leftJoin(countries, eq(battles.countryId, countries.id))
    .leftJoin(winnerCountries, eq(battles.winnerId, winnerCountries.id))
    .leftJoin(loserCountries, eq(battles.loserId, loserCountries.id))
    .leftJoin(wars, eq(battles.warId, wars.id))
    .leftJoin(
      battlesToParticipants,
      eq(battlesToParticipants.battleId, battles.id),
    )
    .leftJoin(
      participants,
      eq(battlesToParticipants.participantId, participants.id),
    )
    .where(opts.where)
    .groupBy(
      battles.id,
      countries.id,
      countries.name,
      winnerCountries.id,
      winnerCountries.name,
      loserCountries.id,
      loserCountries.name,
      wars.id,
      wars.name,
    )
    // Stable order so limit/offset pages never repeat or skip rows
    .orderBy(battles.year, battles.id)
    .limit(opts.limit)
    .offset(opts.offset)

  return {
    items: rows.map(toBattle),
    total: rows.length > 0 ? rows[0].total : 0,
  }
}

/** A single battle by id, with every relation joined in. */
export async function fetchBattleById(
  id: number,
): Promise<BattleWithWar | null> {
  const { items } = await fetchBattles({
    where: eq(battles.id, id),
    limit: 1,
    offset: 0,
  })
  return items.at(0) ?? null
}

/** Battles (optionally filtered by year), paginated. */
export async function fetchBattlesPage(opts: {
  year?: number
  page: number
  pageSize: number
}): Promise<BattlesPage> {
  const where =
    opts.year !== undefined ? eq(battles.year, opts.year) : undefined

  const page = async (p: number) =>
    fetchBattles({
      where,
      limit: opts.pageSize,
      offset: (p - 1) * opts.pageSize,
    })

  let { items, total } = await page(opts.page)

  // A page past the end returns no rows (so no window total); fall back
  // to the first page.
  let currentPage = opts.page
  if (items.length === 0 && opts.page > 1) {
    ;({ items, total } = await page(1))
    currentPage = 1
  }

  const totalPages = Math.max(1, Math.ceil(total / opts.pageSize))
  if (items.length > 0) currentPage = Math.min(currentPage, totalPages)

  return { items, total, totalPages, currentPage }
}
