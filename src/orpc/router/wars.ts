import { getDb } from '#/db/index.ts'
import { os } from '@orpc/server'
import { z } from 'zod'
import { battles, wars } from '#/db/schema.ts'
import { eq, ilike, sql } from 'drizzle-orm'
import {
  idParam,
  pageInput,
  pageSizeInput,
  paginated,
  warSchema,
  battleWithRelationsSchema,
  battleWithWarSchema,
} from '#/orpc/schema.ts'

const WARS_PER_PAGE = 12

/* Every battle read below is a single SQL statement — the RQB nests
   relations with json_agg, no manual joins or row folding. */

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
  .handler(async ({ input }) =>
    getDb().query.wars.findFirst({
      where: { id: Number(input.warId) },
      with: {
        battles: {
          with: {
            country: true,
            winner: true,
            loser: true,
            participants: true,
          },
          // Stable order so the list never shuffles between visits
          orderBy: { year: 'asc', id: 'asc' },
        },
      },
    }),
  )

export const getBattle = os
  .input(z.object({ battleId: idParam }))
  .output(battleWithWarSchema.nullable().optional())
  .handler(async ({ input }) =>
    getDb().query.battles.findFirst({
      where: { id: Number(input.battleId) },
      with: {
        country: true,
        winner: true,
        loser: true,
        participants: true,
        war: true,
      },
    }),
  )

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
    const where = year !== undefined ? { year } : undefined

    const fetchPage = (p: number) =>
      db.query.battles.findMany({
        where,
        with: {
          country: true,
          winner: true,
          loser: true,
          participants: true,
          war: true,
        },
        orderBy: { year: 'asc', id: 'asc' },
        limit: pageSize,
        offset: (p - 1) * pageSize,
      })

    // Page items and total run as one parallel round-trip pair; the
    // count is index-backed.
    const [items, total] = await Promise.all([
      fetchPage(page),
      db.$count(
        battles,
        year !== undefined ? eq(battles.year, year) : undefined,
      ),
    ])

    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    // A page past the end is empty; fall back to the first page.
    if (items.length === 0 && page > 1) {
      return { items: await fetchPage(1), total, totalPages, currentPage: 1 }
    }

    return { items, total, totalPages, currentPage: Math.min(page, totalPages) }
  })

export const homePage = os
  .input(z.object({ page: pageInput, warName: z.string().optional() }))
  .output(paginated(z.object({ ...warSchema.shape, battle_count: z.number() })))
  .handler(async ({ input: { page, warName } }) => {
    const db = getDb()

    // Wars with battle counts; RQB has no aggregations, so this stays a
    // core query. The filtered total rides along as count(*) over ().
    const fetchPage = async (p: number) =>
      db
        .select({
          id: wars.id,
          name: wars.name,
          battle_count: sql<number>`count(${battles.id})`
            .mapWith(Number)
            .as('battle_count'),
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
