import { z } from 'zod'

/* Shared oRPC contracts: input params and response shapes. Every
   procedure's .input()/.output() is assembled from these blocks. */

/** Route params arrive as strings; ids are numeric in the database. */
export const idParam = z.string().regex(/^\d+$/, 'Must be a numeric id')

export const pageInput = z.coerce.number().int().min(1).default(1)

export const pageSizeInput = z.coerce.number().int().min(1).max(100).default(24)

export const countrySchema = z.object({
  id: z.number(),
  name: z.string(),
})

export const participantSchema = z.object({
  id: z.number(),
  name: z.string(),
})

export const warSchema = z.object({
  id: z.number(),
  name: z.string(),
})

/** Battle columns exactly as the API exposes them. */
const battleColumnsSchema = {
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

/** A battle with its country / winner / loser / participants joined in. */
export const battleWithRelationsSchema = z.object({
  ...battleColumnsSchema,
  country: countrySchema.nullable(),
  winner: countrySchema.nullable(),
  loser: countrySchema.nullable(),
  participants: z.array(participantSchema),
})

/** Same, plus the parent war — the shape every battle list returns. */
export const battleWithWarSchema = battleWithRelationsSchema.extend({
  war: warSchema.nullable(),
})

/**
 * Estimated personnel strength and casualties for the battle's two sides,
 * keyed to the battle's winner/loser columns. Numbers are absolute troop
 * counts; null means unknown. `confidence` grades how well documented the
 * figures are — anything LLM-generated is at best 'estimated'.
 */
export const casualtiesSchema = z.object({
  winnerStrength: z.number().int().nonnegative().nullable(),
  loserStrength: z.number().int().nonnegative().nullable(),
  winnerCasualties: z.number().int().nonnegative().nullable(),
  loserCasualties: z.number().int().nonnegative().nullable(),
  confidence: z.enum(['well-documented', 'estimated', 'speculative']),
})

export type BattleCasualties = z.infer<typeof casualtiesSchema>

/**
 * Single-battle detail payload: list fields plus the generated summary and
 * casualty estimates. Lists stay lean — only getBattle carries these.
 */
export const battleDetailSchema = battleWithWarSchema.extend({
  summary: z.string().nullable(),
  casualties: casualtiesSchema.nullable(),
})

/** A war plus aggregate stats over its battles (all computed in SQL). */
export const warOverviewSchema = z.object({
  ...warSchema.shape,
  summary: z.string().nullable(),
  stats: z.object({
    battleCount: z.number(),
    minYear: z.number().nullable(),
    maxYear: z.number().nullable(),
    combatants: z.array(z.string()),
    theatres: z.array(z.string()),
  }),
})

/** Wraps a list schema with the pagination metadata every list returns. */
export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number(),
    totalPages: z.number(),
    currentPage: z.number(),
  })
