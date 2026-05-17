import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'

import {
  battles,
  wars,
  countries,
  participants,
  battlesToParticipants,
} from '../src/db/schema.ts'
import { relations } from '#/db/relations.ts'

/* =========================================================
   DATABASE
========================================================= */

export const db = drizzle(process.env.DATABASE_URL!, {
  relations,
})

/* =========================================================
   TYPES
========================================================= */

interface BattleJson {
  id: string
  country: string
  battle: string
  year: number | string | null
  latitude: number | string | null
  longitude: number | string | null
  participants: string[]
  war: string
  winner: string
  loser: string
  scale: number | null
  theatre: ('Air' | 'Land' | 'Sea')[]
  massacre: boolean
}

type InsertableBattle = typeof battles.$inferInsert
type InsertableBattleParticipant = typeof battlesToParticipants.$inferInsert

interface CleanedData {
  battles: BattleJson[]
}

/* =========================================================
   HELPERS
========================================================= */

const CHUNK_SIZE = 1000

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }

  return chunks
}

async function batchInsert(
  table: any,
  values: unknown[],
  message: string,
): Promise<void> {
  if (values.length === 0) {
    console.log(`${message} (skipped - no values)`)
    return
  }

  const chunks = chunkArray(values, CHUNK_SIZE)

  for (let i = 0; i < chunks.length; i++) {
    await db.insert(table).values(chunks[i]).onConflictDoNothing()

    console.log(`${message}: ${i + 1}/${chunks.length}`)
  }
}

/* =========================================================
   LOAD JSON
========================================================= */

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const jsonPath = join(__dirname, '../data-clean/cleaned_data.json')

const rawJson = readFileSync(jsonPath, 'utf-8')

const data = JSON.parse(rawJson) as CleanedData

/* =========================================================
   MAIN SEED
========================================================= */

async function seed() {
  console.log('Starting seed...')

  /* =========================================================
     STEP 1 — EXTRACT UNIQUE VALUES
  ========================================================= */

  const uniqueCountries = new Set<string>()
  const uniqueWars = new Set<string>()
  const uniqueParticipants = new Set<string>()

  for (const battle of data.battles) {
    uniqueCountries.add(battle.country)
    uniqueCountries.add(battle.winner)
    uniqueCountries.add(battle.loser)

    uniqueWars.add(battle.war)

    for (const participant of battle.participants) {
      uniqueParticipants.add(participant)
    }
  }

  console.log('Unique extraction completed')

  /* =========================================================
     STEP 2 — BULK INSERT MASTER TABLES
  ========================================================= */

  await batchInsert(
    countries,
    [...uniqueCountries].map((name) => ({ name })),
    'Countries inserted',
  )

  await batchInsert(
    wars,
    [...uniqueWars].map((name) => ({ name })),
    'Wars inserted',
  )

  await batchInsert(
    participants,
    [...uniqueParticipants].map((name) => ({ name })),
    'Participants inserted',
  )

  console.log('Master tables inserted')

  /* =========================================================
     STEP 3 — LOAD IDS INTO MAPS
  ========================================================= */

  const allCountries = await db.select().from(countries)
  const allWars = await db.select().from(wars)
  const allParticipants = await db.select().from(participants)

  const countryMap = new Map<string, number>()
  const warMap = new Map<string, number>()

  const participantMap = new Map<string, number>()

  for (const item of allCountries) {
    countryMap.set(item.name, item.id)
  }

  for (const item of allWars) {
    warMap.set(item.name, item.id)
  }

  for (const item of allParticipants) {
    participantMap.set(item.name, item.id)
  }

  console.log('Maps created')

  /* =========================================================
     STEP 4 — PREPARE BATTLE INSERTS
  ========================================================= */

  const battleRows: InsertableBattle[] = []
  const missingKeys = new Set<string>()

  for (const battle of data.battles) {
    // Skip battles with invalid coordinates or year
    const hasInvalidCoords =
      battle.latitude === null ||
      battle.longitude === null ||
      battle.latitude === '' ||
      battle.longitude === ''
    const hasInvalidYear = battle.year === null || battle.year === ''

    if (hasInvalidCoords || hasInvalidYear) {
      missingKeys.add(`invalid data: "${battle.battle}"`)
      continue
    }

    const countryId = countryMap.get(battle.country)
    const winnerId = countryMap.get(battle.winner)
    const loserId = countryMap.get(battle.loser)
    const warId = warMap.get(battle.war)

    if (!countryId) missingKeys.add(`country: "${battle.country}"`)
    if (!winnerId) missingKeys.add(`winner: "${battle.winner}"`)
    if (!loserId) missingKeys.add(`loser: "${battle.loser}"`)
    if (!warId) missingKeys.add(`war: "${battle.war}"`)

    if (countryId && winnerId && loserId && warId) {
      battleRows.push({
        name: battle.battle,
        year: Number(battle.year),
        latitude: Number(battle.latitude),
        longitude: Number(battle.longitude),
        scale: battle.scale,
        massacre: battle.massacre,
        theatres: battle.theatre,
        countryId,
        winnerId,
        loserId,
        warId,
      })
    }
  }

  if (missingKeys.size > 0) {
    console.warn(
      `\n⚠️  Warning: Skipping ${battleRows.length === 0 ? 'ALL' : data.battles.length - battleRows.length} battle(s) due to missing refs:`,
    )
    for (const key of missingKeys) {
      console.warn(`   - ${key}`)
    }
    console.warn()
  }

  console.log(
    `Battle rows prepared: ${battleRows.length} / ${data.battles.length}`,
  )

  /* =========================================================
     STEP 5 — INSERT BATTLES
  ========================================================= */

  const battleChunks = chunkArray(battleRows, CHUNK_SIZE)

  for (let i = 0; i < battleChunks.length; i++) {
    await db.insert(battles).values(battleChunks[i]).onConflictDoNothing()

    console.log(`Battles inserted: ${i + 1}/${battleChunks.length}`)
  }

  console.log('Battles inserted successfully')

  /* =========================================================
     STEP 6 — FETCH BATTLES FOR IDS
  ========================================================= */

  const allBattles = await db.select().from(battles)

  // Use name + year as composite key to avoid collisions
  // (multiple battles can have the same name but different years)
  const battleMap = new Map<string, number>()

  for (const battle of allBattles) {
    const key = `${battle.name}|${battle.year}`
    battleMap.set(key, battle.id)
  }

  console.log(`Battle map created: ${allBattles.length} battles`)

  /* =========================================================
     STEP 7 — BUILD JUNCTION TABLE ROWS
  ========================================================= */

  const participantRelations: InsertableBattleParticipant[] = []

  let skippedBattleCount = 0
  let skippedParticipantCount = 0

  for (const battle of data.battles) {
    const battleKey = `${battle.battle}|${battle.year}`
    const battleId = battleMap.get(battleKey)

    if (!battleId) {
      skippedBattleCount++
      continue
    }

    for (const participant of battle.participants) {
      const participantId = participantMap.get(participant)

      if (!participantId) {
        skippedParticipantCount++
        continue
      }

      participantRelations.push({
        battleId,
        participantId,
      })
    }
  }

  if (skippedBattleCount > 0 || skippedParticipantCount > 0) {
    console.warn('\n⚠️  Junction table warnings:')
    if (skippedBattleCount > 0)
      console.warn(`   - Skipped ${skippedBattleCount} battles not found in DB`)
    if (skippedParticipantCount > 0)
      console.warn(
        `   - Skipped ${skippedParticipantCount} participant relations (participant not found)`,
      )

    console.warn()
  }

  /* =========================================================
     STEP 8 — INSERT JUNCTION TABLES
  ========================================================= */

  await batchInsert(
    battlesToParticipants,
    participantRelations,
    'Battle-participant relations inserted',
  )

  console.log('Seed completed successfully')
}

/* =========================================================
   RUN
========================================================= */

seed()
  .then(() => {
    console.log('DONE')
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
