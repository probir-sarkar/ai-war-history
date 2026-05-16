import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { drizzle } from 'drizzle-orm/libsql'
import { eq, inArray } from 'drizzle-orm'

import {
  battles,
  wars,
  countries,
  theatres,
  participants,
  battlesToParticipants,
  battlesToTheatres,
  relations,
} from '../src/db/schema.ts'

/* =========================================================
   DATABASE
========================================================= */

const db = drizzle({
  connection: {
    url: process.env.TURSO_CONNECTION_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
  relations,
})

/* =========================================================
   TYPES
========================================================= */

interface BattleJson {
  id: string
  country: string
  battle: string
  year: number
  latitude: number
  longitude: number
  participants: string[]
  war: string
  winner: string
  loser: string
  scale: number | null
  theatre: string[]
  massacre: boolean
}

interface CleanedData {
  battles: BattleJson[]
}

/* =========================================================
   HELPERS
========================================================= */

const CHUNK_SIZE = 500

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }

  return chunks
}

async function batchInsert<T>(table: any, values: T[], message: string) {
  const chunks = chunkArray(values, CHUNK_SIZE)

  for (let i = 0; i < chunks.length; i++) {
    await db
      .insert(table)
      .values(chunks[i] as any)
      .onConflictDoNothing()

    console.log(`${message}: ${i + 1}/${chunks.length}`)
  }
}

/* =========================================================
   LOAD JSON
========================================================= */

const rawJson = readFileSync('./data-clean/cleaned_data.json', 'utf-8')

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
  const uniqueTheatres = new Set<string>()
  const uniqueParticipants = new Set<string>()

  for (const battle of data.battles) {
    uniqueCountries.add(battle.country)
    uniqueCountries.add(battle.winner)
    uniqueCountries.add(battle.loser)

    uniqueWars.add(battle.war)

    for (const theatre of battle.theatre) {
      uniqueTheatres.add(theatre)
    }

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
    theatres,
    [...uniqueTheatres].map((name) => ({ name })),
    'Theatres inserted',
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
  const allTheatres = await db.select().from(theatres)
  const allParticipants = await db.select().from(participants)

  const countryMap = new Map<string, number>()
  const warMap = new Map<string, number>()
  const theatreMap = new Map<string, number>()
  const participantMap = new Map<string, number>()

  for (const item of allCountries) {
    countryMap.set(item.name, item.id)
  }

  for (const item of allWars) {
    warMap.set(item.name, item.id)
  }

  for (const item of allTheatres) {
    theatreMap.set(item.name, item.id)
  }

  for (const item of allParticipants) {
    participantMap.set(item.name, item.id)
  }

  console.log('Maps created')

  /* =========================================================
     STEP 4 — PREPARE BATTLE INSERTS
  ========================================================= */

  const battleRows = data.battles.map((battle) => ({
    name: battle.battle,
    year: battle.year,
    latitude: battle.latitude,
    longitude: battle.longitude,
    scale: battle.scale,
    massacre: battle.massacre,

    countryId: countryMap.get(battle.country)!,
    winnerId: countryMap.get(battle.winner)!,
    loserId: countryMap.get(battle.loser)!,
    warId: warMap.get(battle.war)!,
  }))

  console.log('Battle rows prepared')

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

  const battleMap = new Map<string, number>()

  for (const battle of allBattles) {
    battleMap.set(battle.name, battle.id)
  }

  console.log('Battle map created')

  /* =========================================================
     STEP 7 — BUILD JUNCTION TABLE ROWS
  ========================================================= */

  const participantRelations: {
    battleId: number
    participantId: number
  }[] = []

  const theatreRelations: {
    battleId: number
    theatreId: number
  }[] = []

  for (const battle of data.battles) {
    const battleId = battleMap.get(battle.battle)

    if (!battleId) continue

    for (const participant of battle.participants) {
      const participantId = participantMap.get(participant)

      if (!participantId) continue

      participantRelations.push({
        battleId,
        participantId,
      })
    }

    for (const theatre of battle.theatre) {
      const theatreId = theatreMap.get(theatre)

      if (!theatreId) continue

      theatreRelations.push({
        battleId,
        theatreId,
      })
    }
  }

  console.log('Junction rows prepared')

  /* =========================================================
     STEP 8 — INSERT JUNCTION TABLES
  ========================================================= */

  await batchInsert(
    battlesToParticipants,
    participantRelations,
    'Battle-participant relations inserted',
  )

  await batchInsert(
    battlesToTheatres,
    theatreRelations,
    'Battle-theatre relations inserted',
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
