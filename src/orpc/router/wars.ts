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
import type { SQL } from 'drizzle-orm'
import { and, eq, ilike, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

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

type BattleWithWar = z.infer<typeof battleWithWarSchema>

const paginationMeta = {
  total: z.number(),
  totalPages: z.number(),
  currentPage: z.number(),
}

/* =========================================================
   QUERYING
   Every battle-reading procedure runs as a single round-trip:
   one join query that aggregates participants with json_agg and
   carries the filtered total via a window count.
========================================================= */

const winnerCountries = alias(countries, 'winner_countries')
const loserCountries = alias(countries, 'loser_countries')

const parseJson = (value: unknown) =>
  typeof value === 'string' ? JSON.parse(value) : value

const participantsAgg = sql`coalesce(
  json_agg(json_build_object('id', ${participants.id}, 'name', ${participants.name}))
    filter (where ${participants.id} is not null),
  '[]'::json
)`.mapWith(parseJson)

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

function toBattle(row: BattleRow): BattleWithWar {
  return {
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
  }
}

async function fetchBattlesWithRelations(opts: {
  where?: SQL
  limit?: number
  offset?: number
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
    .limit(opts.limit ?? 1_000_000)
    .offset(opts.offset ?? 0)

  return {
    items: rows.map(toBattle),
    total: rows.length > 0 ? rows[0].total : 0,
  }
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
    const wars_ = await db
      .select({ id: wars.id, name: wars.name })
      .from(wars)
      .where(eq(wars.id, Number(input.warId)))
      .limit(1)

    const war = wars_.at(0)
    if (!war) return null

    const { items: battles_ } = await fetchBattlesWithRelations({
      where: eq(battles.warId, war.id),
    })

    return { id: war.id, name: war.name, battles: battles_ }
  })

export const getBattle = os
  .input(z.object({ battleId: idParam }))
  .output(battleWithWarSchema.nullable().optional())
  .handler(async ({ input }) => {
    const { items } = await fetchBattlesWithRelations({
      where: eq(battles.id, Number(input.battleId)),
      limit: 1,
    })

    return items[0] ?? null
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
    const where = year !== undefined ? eq(battles.year, year) : undefined

    let { items, total } = await fetchBattlesWithRelations({
      where,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    })

    // A page past the end returns no rows (so no window total); fall
    // back to the first page.
    let currentPage = page
    if (items.length === 0 && page > 1) {
      ;({ items, total } = await fetchBattlesWithRelations({
        where,
        limit: pageSize,
        offset: 0,
      }))
      currentPage = 1
    }

    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    if (items.length > 0) currentPage = Math.min(currentPage, totalPages)

    return { items, total, totalPages, currentPage }
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
