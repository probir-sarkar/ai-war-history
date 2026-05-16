import { defineRelations } from 'drizzle-orm'
import { primaryKey, sqliteTable } from 'drizzle-orm/sqlite-core'

export const battles = sqliteTable('battles', (t) => ({
  id: t.integer('id').primaryKey({ autoIncrement: true }),
  name: t.text('name').notNull().unique(),
  year: t.integer('year').notNull(),
  latitude: t.real('latitude').notNull(),
  longitude: t.real('longitude').notNull(),
  scale: t.integer('scale'),
  massacre: t.integer('massacre', { mode: 'boolean' }),
  countryId: t.integer('country_id').references(() => countries.id),
  winnerId: t.integer('winner_id').references(() => countries.id),
  loserId: t.integer('loser_id').references(() => countries.id),
  warId: t
    .integer('war_id')
    .notNull()
    .references(() => wars.id),
}))

export const wars = sqliteTable('wars', (t) => ({
  id: t.integer('id').primaryKey({ autoIncrement: true }),
  name: t.text('name').notNull(),
}))

export const countries = sqliteTable('countries', (t) => ({
  id: t.integer('id').primaryKey({ autoIncrement: true }),
  name: t.text('name').notNull(),
}))

export const participants = sqliteTable('participants', (t) => ({
  id: t.integer('id').primaryKey({ autoIncrement: true }),
  name: t.text('name').notNull(),
}))

export const theatres = sqliteTable('theatres', (t) => ({
  id: t.integer('id').primaryKey({ autoIncrement: true }),
  name: t.text('name').notNull(),
}))

export const battlesToParticipants = sqliteTable(
  'battles_to_participants',
  (t) => ({
    id: t.integer('id').primaryKey({ autoIncrement: true }),
    battleId: t
      .integer('battle_id')
      .notNull()
      .references(() => battles.id),
    participantId: t
      .integer('participant_id')
      .notNull()
      .references(() => participants.id),
  }),
  (t) => [
    primaryKey({
      columns: [t.battleId, t.participantId],
    }),
  ],
)

export const battlesToTheatres = sqliteTable(
  'battles_to_theatres',
  (t) => ({
    id: t.integer('id').primaryKey({ autoIncrement: true }),
    battleId: t
      .integer('battle_id')
      .notNull()
      .references(() => battles.id),
    theatreId: t
      .integer('theatre_id')
      .notNull()
      .references(() => theatres.id),
  }),
  (t) => [
    primaryKey({
      columns: [t.battleId, t.theatreId],
    }),
  ],
)

export const relations = defineRelations(
  {
    battles,
    wars,
    countries,
    participants,
    theatres,
    battlesToParticipants,
    battlesToTheatres,
  },
  (r) => ({
    battles: {
      war: r.one.wars({
        from: r.battles.warId,
        to: r.wars.id,
      }),
      country: r.one.countries({
        from: r.battles.countryId,
        to: r.countries.id,
      }),
      winner: r.one.countries({
        from: r.battles.winnerId,
        to: r.countries.id,
      }),
      loser: r.one.countries({
        from: r.battles.loserId,
        to: r.countries.id,
      }),
      participants: r.many.participants({
        from: r.battles.id.through(r.battlesToParticipants.battleId),
        to: r.participants.id.through(r.battlesToParticipants.participantId),
      }),
      theatres: r.many.theatres({
        from: r.battles.id.through(r.battlesToTheatres.battleId),
        to: r.theatres.id.through(r.battlesToTheatres.theatreId),
      }),
    },
    wars: {
      battles: r.many.battles(),
    },
    countries: {
      battlesAsCountry: r.many.battles({
        from: r.countries.id,
        to: r.battles.countryId,
      }),
      battlesAsWinner: r.many.battles({
        from: r.countries.id,
        to: r.battles.winnerId,
      }),
      battlesAsLoser: r.many.battles({
        from: r.countries.id,
        to: r.battles.loserId,
      }),
    },
    participants: {
      battles: r.many.battles(),
    },
    theatres: {
      battles: r.many.battles(),
    },
  }),
)
