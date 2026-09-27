import { getDb } from '#/db/index.ts'
import { os } from '@orpc/server'
import { z } from 'zod'
import {
  battles,
  battlesToParticipants,
  countries,
  participants,
  wars,
} from '#/db/schema.ts'
import { eq, ilike, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import {
  battleColumnsSchema,
  battleWithRelationsSchema,
  battleWithWarSchema,
  idParam,
  pageInput,
  pageSizeInput,
  paginated,
  participantSchema,
  warSchema,
} from '#/orpc/schema.ts'
import type { BattleWithWar } from '#/orpc/schema.ts'

const WARS_PER_PAGE = 12

/* =========================================================
   SHARED SQL BUILDING BLOCKS
   Pure data used by the battle handlers below — column
   selections, the row type, and the row→API mapper. All
   control flow lives inside each handler.
========================================================= */

const winnerCountries = alias(countries, 'winner_countries')
const loserCountries = alias(countries, 'loser_countries')

const parseJson = (value: unknown) =>
  typeof value === 'string' ? JSON.parse(value) : value

/** Flat joined row: battle columns + relation columns + window total. */
const battleFields = {
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
  participants: sql`coalesce(
    json_agg(json_build_object('id', ${participants.id}, 'name', ${participants.name}))
      filter (where ${participants.id} is not null),
    '[]'::json
  )`.mapWith(parseJson),
}

/** Row type extracted from zod so it stays in lockstep with the API schemas. */
type BattleRow = z.infer<typeof battleRowSchema>

const battleRowSchema = z.object({
  ...battleColumnsSchema,
  countryRefId: z.number().nullable(),
  countryName: z.string().nullable(),
  winnerRefId: z.number().nullable(),
  winnerName: z.string().nullable(),
  loserRefId: z.number().nullable(),
  loserName: z.string().nullable(),
  warRefId: z.number().nullable(),
  warName: z.string().nullable(),
  total: z.number(),
  participants: z.array(participantSchema),
})

/** Folds a flat joined row into the nested API shape. */
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

    const warRows = await db
      .select({ id: wars.id, name: wars.name })
      .from(wars)
      .where(eq(wars.id, Number(input.warId)))
      .limit(1)

    const war = warRows.at(0)
    if (!war) return null

    // One round-trip for every battle of the war, relations joined in.
    const rows: BattleRow[] = await db
      .select(battleFields)
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
      .where(eq(battles.warId, war.id))
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
      .orderBy(battles.year, battles.id)

    return { id: war.id, name: war.name, battles: rows.map(toBattle) }
  })

export const getBattle = os
  .input(z.object({ battleId: idParam }))
  .output(battleWithWarSchema.nullable().optional())
  .handler(async ({ input }) => {
    const db = getDb()

    // One round-trip: battle + country/winner/loser/war joins,
    // participants aggregated with json_agg.
    const rows: BattleRow[] = await db
      .select(battleFields)
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
      .where(eq(battles.id, Number(input.battleId)))
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
      .limit(1)

    return rows.map(toBattle).at(0) ?? null
  })

export const listAllBattles = os
  .input(
    z.object({
      year: z.coerce.number().int().optional(),
      page: pageInput,
      pageSize: pageSizeInput,
    }),
  )
  .output(paginated(battleWithWarSchema))
  .handler(async ({ input: { year, page, pageSize } }) => {
    const db = getDb()

    // Page fetch + filtered total in one round-trip: the total rides
    // along as count(*) over (), participants as json_agg.
    const fetchPage = async (p: number): Promise<BattleRow[]> =>
      db
        .select(battleFields)
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
        .where(year !== undefined ? eq(battles.year, year) : undefined)
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
        .limit(pageSize)
        .offset((p - 1) * pageSize)

    let rows = await fetchPage(page)

    // A page past the end returns no rows (so no window total); fall
    // back to the first page.
    if (rows.length === 0 && page > 1) {
      rows = await fetchPage(1)
    }

    const total = rows.at(0)?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    return {
      items: rows.map(toBattle),
      total,
      totalPages,
      currentPage: rows.length === 0 ? 1 : Math.min(page, totalPages),
    }
  })

export const homePage = os
  .input(z.object({ page: pageInput, warName: z.string().optional() }))
  .output(paginated(z.object({ ...warSchema.shape, battle_count: z.number() })))
  .handler(async ({ input: { page, warName } }) => {
    const db = getDb()

    // Wars with battle counts; the filtered total rides along as
    // count(*) over (), evaluated per group across the whole set.
    const fetchPage = async (p: number) =>
      db
        .select({
          id: wars.id,
          name: wars.name,
          battle_count: sql<number>`count(${battles.id})`.mapWith(Number),
          total: sql<number>`count(*) over ()`.mapWith(Number),
        })
        .from(wars)
        .leftJoin(battles, eq(battles.warId, wars.id))
        .where(warName ? ilike(wars.name, `%${warName}%`) : undefined)
        .groupBy(wars.id, wars.name)
        .orderBy(wars.id)
        .limit(WARS_PER_PAGE)
        .offset((p - 1) * WARS_PER_PAGE)

    let rows = await fetchPage(page)

    // A page past the end returns no rows (so no window total); fall
    // back to the first page.
    if (rows.length === 0 && page > 1) {
      rows = await fetchPage(1)
    }

    const total = rows.at(0)?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / WARS_PER_PAGE))

    return {
      items: rows.map((w) => ({
        id: w.id,
        name: w.name,
        battle_count: w.battle_count,
      })),
      total,
      totalPages,
      currentPage: rows.length === 0 ? 1 : Math.min(page, totalPages),
    }
  })
