import { os } from '@orpc/server'
import { z } from 'zod'
import {
  idParam,
  pageInput,
  pageSizeInput,
  paginated,
  warSchema,
  battleWithRelationsSchema,
  battleWithWarSchema,
} from '#/orpc/schema.ts'
import { fetchBattleById, fetchBattlesPage } from '#/db/queries/battles.ts'
import { fetchWarWithBattles, fetchWarsPage } from '#/db/queries/wars.ts'

const WARS_PER_PAGE = 12

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
  .handler(async ({ input }) => fetchWarWithBattles(Number(input.warId)))

export const getBattle = os
  .input(z.object({ battleId: idParam }))
  .output(battleWithWarSchema.nullable().optional())
  .handler(async ({ input }) => fetchBattleById(Number(input.battleId)))

export const listAllBattles = os
  .input(
    z.object({
      year: z.coerce.number().int().optional(),
      page: pageInput,
      pageSize: pageSizeInput,
    }),
  )
  .output(paginated(battleWithWarSchema))
  .handler(async ({ input }) =>
    fetchBattlesPage({
      year: input.year,
      page: input.page,
      pageSize: input.pageSize,
    }),
  )

export const homePage = os
  .input(z.object({ page: pageInput, warName: z.string().optional() }))
  .output(paginated(z.object({ ...warSchema.shape, battle_count: z.number() })))
  .handler(async ({ input }) =>
    fetchWarsPage({
      page: input.page,
      perPage: WARS_PER_PAGE,
      warName: input.warName,
    }),
  )
