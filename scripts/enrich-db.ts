import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, isNull, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'

import {
  battles,
  wars,
  countries,
  participants,
  battlesToParticipants,
} from '../src/db/schema.ts'
import { casualtiesSchema } from '../src/orpc/schema.ts'

const winnerCountries = alias(countries, 'winner_countries')
const loserCountries = alias(countries, 'loser_countries')

/* =========================================================
   CONFIG
========================================================= */

const db = drizzle(process.env.DATABASE_URL)

const BASE_URL = process.env.OPENAI_BASE_URL!.replace(/\/+$/, '')
const API_KEY = process.env.OPENAI_API_KEY!
const MODEL = 'deepseek-v3.2'

/**
 * Battles in flight at once. 8 sustained triggers the provider's 429 rate
 * limit (pilot at 50 calls didn't, a long run does) — 4 stays under it.
 */
const BATTLE_CONCURRENCY = 4
/** Wars per LLM call — war rows only carry a name, so they batch cheaply. */
const WARS_PER_CALL = 20
/** LLM attempts per item (HTTP retries + malformed-JSON retries share this budget). */
const MAX_ATTEMPTS = 5

/* =========================================================
   CLI
========================================================= */

// --battles N / --wars N limit the work queue; omit for a full run.
// Rows already enriched are skipped either way, so runs are resumable
// and a pilot batch counts toward the full run.
function numArg(name: string): number | undefined {
  const i = process.argv.indexOf(name)
  if (i === -1) return undefined
  const v = Number(process.argv[i + 1])
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : undefined
}

const battleLimit = numArg('--battles')
const warLimit = numArg('--wars')
// Skip the battle phase entirely — useful to top up war summaries while a
// full battle run is still in flight elsewhere.
const warsOnly = process.argv.includes('--wars-only')

/* =========================================================
   LLM
========================================================= */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Pull the first JSON object/array out of a model response. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = (fenced ? fenced[1] : text).trim()
  return JSON.parse(body)
}

async function chatJson<T>(
  schema: z.ZodType<T>,
  messages: { role: 'system' | 'user'; content: string }[],
  label: string,
): Promise<T | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: 0.2,
          max_tokens: 800,
          response_format: { type: 'json_object' },
        }),
      })

      if (res.status === 429 || res.status >= 500) {
        const wait = 2 ** attempt * 3000
        console.warn(
          `   ${label}: HTTP ${res.status}, retry ${attempt}/${MAX_ATTEMPTS} in ${wait}ms`,
        )
        await sleep(wait)
        continue
      }

      if (!res.ok) {
        console.error(`   ${label}: HTTP ${res.status} — ${await res.text()}`)
        return null
      }

      const body = chatResponseSchema.parse(await res.json())
      const content = body.choices?.[0]?.message?.content
      if (!content) {
        console.warn(
          `   ${label}: empty response, retry ${attempt}/${MAX_ATTEMPTS}`,
        )
        continue
      }

      return schema.parse(extractJson(content))
    } catch (err) {
      console.warn(
        `   ${label}: ${err instanceof Error ? err.message : err} — retry ${attempt}/${MAX_ATTEMPTS}`,
      )
      await sleep(2 ** attempt * 3000)
    }
  }

  console.error(`   ${label}: giving up after ${MAX_ATTEMPTS} attempts`)
  return null
}

/* =========================================================
   PROMPTS
========================================================= */

const BATTLE_SYSTEM = `You are a military historian enriching a battle database. You will be given structured facts about one battle. Produce a JSON object with exactly these fields:

- "summary": 2-3 factual sentences (max 70 words) covering what happened, who fought, the outcome, and the battle's significance. Plain prose, no markdown, no citation markup.
- "scale": integer 1-6 estimating the engagement's magnitude: 1 = skirmish or raid, 2 = minor action, 3 = significant battle, 4 = major battle, 5 = large decisive battle, 6 = campaign-scale operation involving whole armies (e.g. Kursk 1943, Operation Bagration). Calibrate so 5 and 6 are rare — most battles are 1-3.
- "winnerStrength", "loserStrength", "winnerCasualties", "loserCasualties": estimated personnel counts (integers) for the victorious and defeated sides as named in the input; null when genuinely unknown. Use rough historical estimates rounded sensibly, never false precision. For a drawn battle, apply the sides as best the input allows.
- "confidence": "well-documented", "estimated", or "speculative" — how reliably documented this battle and its figures are overall.

If the battle is obscure or you cannot confidently identify it, say so plainly in the summary (e.g. "a poorly documented engagement"), leave the numbers null, and use "speculative". Prefer omission over fabrication. Respond with a single JSON object only.`

const llmBattleSchema = z.object({
  summary: z.string().min(1).max(1200),
  scale: z.number().int().min(1).max(6),
  winnerStrength: z.number().int().nonnegative().nullable(),
  loserStrength: z.number().int().nonnegative().nullable(),
  winnerCasualties: z.number().int().nonnegative().nullable(),
  loserCasualties: z.number().int().nonnegative().nullable(),
  confidence: z.enum(['well-documented', 'estimated', 'speculative']),
})

const WAR_SYSTEM = `You are a historian writing for a war history archive. You will be given a JSON array of wars, each with an "id" and "name". For each war write a "summary": 2-3 factual sentences (max 70 words) covering the belligerents, period, cause, outcome, and significance. Plain prose, no markdown.

If a name is ambiguous or obscure, describe the most commonly referenced conflict known by that exact name and note the uncertainty briefly (e.g. "likely referring to..."). Prefer omission over fabrication. Respond with a single JSON object: {"wars": [{"id": <id from input>, "summary": "..."}]}`

const llmWarsSchema = z.object({
  wars: z.array(
    z.object({
      id: z.number(),
      summary: z.string().min(1).max(1200),
    }),
  ),
})

/** Shape of an OpenAI-compatible /chat/completions response we care about. */
const chatResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().optional() }).optional(),
      }),
    )
    .optional(),
})

/* =========================================================
   WORKERS
========================================================= */

/** Battle context sent to the model. */
const battleWorkShape = {
  id: battles.id,
  name: battles.name,
  year: battles.year,
  scale: battles.scale,
  theatres: battles.theatres,
  country: countries.name,
  winner: winnerCountries.name,
  loser: loserCountries.name,
  war: wars.name,
}

async function fetchBattleWork(limit: number) {
  return db
    .select(battleWorkShape)
    .from(battles)
    .leftJoin(wars, eq(wars.id, battles.warId))
    .leftJoin(countries, eq(countries.id, battles.countryId))
    .leftJoin(winnerCountries, eq(winnerCountries.id, battles.winnerId))
    .leftJoin(loserCountries, eq(loserCountries.id, battles.loserId))
    .where(isNull(battles.summary))
    .orderBy(sql`random()`)
    .limit(limit)
}

type BattleWork = Awaited<ReturnType<typeof fetchBattleWork>>[number]

/** Empty strings in the data ("", loser: "") carry no signal for the model. */
const nz = (s: string | null): string | undefined =>
  s && s.trim() !== '' ? s : undefined

async function processBattle(row: BattleWork) {
  const parts = await db
    .select({ name: participants.name })
    .from(battlesToParticipants)
    .innerJoin(
      participants,
      eq(participants.id, battlesToParticipants.participantId),
    )
    .where(eq(battlesToParticipants.battleId, row.id))

  const context = {
    name: row.name,
    year: row.year,
    war: nz(row.war),
    country: nz(row.country),
    winner: nz(row.winner),
    loser: nz(row.loser),
    theatres: row.theatres ?? [],
    participants: parts.map((p) => p.name),
  }

  const result = await chatJson(
    llmBattleSchema,
    [
      { role: 'system', content: BATTLE_SYSTEM },
      { role: 'user', content: JSON.stringify(context) },
    ],
    `battle ${row.id} "${row.name}"`,
  )
  if (!result) return false

  await db
    .update(battles)
    .set({
      summary: result.summary,
      casualties: casualtiesSchema.parse({
        winnerStrength: result.winnerStrength,
        loserStrength: result.loserStrength,
        winnerCasualties: result.winnerCasualties,
        loserCasualties: result.loserCasualties,
        confidence: result.confidence,
      }),
      // Only backfill scale — never overwrite a value already in the DB.
      ...(row.scale == null ? { scale: result.scale } : {}),
    })
    .where(sql`${battles.id} = ${row.id}`)

  return true
}

async function processWarBatch(batch: (typeof wars.$inferSelect)[]) {
  const result = await chatJson(
    llmWarsSchema,
    [
      { role: 'system', content: WAR_SYSTEM },
      {
        role: 'user',
        content: JSON.stringify(batch.map((w) => ({ id: w.id, name: w.name }))),
      },
    ],
    `wars ${batch[0].id}–${batch[batch.length - 1].id}`,
  )
  if (!result) return 0

  let written = 0
  for (const item of result.wars) {
    if (!batch.some((w) => w.id === item.id)) continue
    await db
      .update(wars)
      .set({ summary: item.summary })
      .where(sql`${wars.id} = ${item.id}`)
    written++
  }
  return written
}

async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<boolean>,
) {
  let cursor = 0
  let done = 0
  const started = Date.now()

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const item = items[cursor++]
        const ok = await worker(item)
        done++
        if (done % 10 === 0 || done === items.length) {
          const rate = done / ((Date.now() - started) / 1000)
          console.log(
            `   progress: ${done}/${items.length} processed, ${ok ? '' : 'see warnings above'} ` +
              `(${rate.toFixed(1)}/s)`,
          )
        }
      }
    }),
  )
}

/* =========================================================
   MAIN
========================================================= */

async function main() {
  console.log(`Enriching with ${MODEL} at ${new URL(BASE_URL).host}`)
  if (battleLimit) console.log(`battle limit: ${battleLimit}`)
  if (warLimit) console.log(`war limit: ${warLimit}`)

  /* ---- battles ---- */

  const battleRows = warsOnly
    ? []
    : await fetchBattleWork(battleLimit ?? Number.MAX_SAFE_INTEGER)

  console.log(`Battles to enrich: ${battleRows.length}`)

  if (battleRows.length > 0) {
    await runPool(battleRows, BATTLE_CONCURRENCY, processBattle)
  }

  /* ---- wars ---- */

  const warRows = (
    await db
      .select()
      .from(wars)
      .where(isNull(wars.summary))
      .orderBy(sql`random()`)
      .limit(warLimit ?? Number.MAX_SAFE_INTEGER)
  ).filter((w) => w.name.trim() !== '')

  console.log(`Wars to enrich: ${warRows.length}`)

  let warsWritten = 0
  for (let i = 0; i < warRows.length; i += WARS_PER_CALL) {
    warsWritten += await processWarBatch(warRows.slice(i, i + WARS_PER_CALL))
  }

  console.log(`War summaries written: ${warsWritten}/${warRows.length}`)
  console.log('DONE')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
