import { primaryKey, sqliteTable, unique } from 'drizzle-orm/sqlite-core'

export const battles = sqliteTable(
  'battles',
  (t) => ({
    id: t.integer('id').primaryKey(),
    name: t.text('name').notNull(),
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
  }),
  (t) => [unique().on(t.name, t.year)],
)

export const wars = sqliteTable('wars', (t) => ({
  id: t.integer('id').primaryKey(),
  name: t.text('name').notNull().unique(),
}))

export const countries = sqliteTable('countries', (t) => ({
  id: t.integer('id').primaryKey(),
  name: t.text('name').notNull().unique(),
}))

export const participants = sqliteTable('participants', (t) => ({
  id: t.integer('id').primaryKey(),
  name: t.text('name').notNull().unique(),
}))

export const theatres = sqliteTable('theatres', (t) => ({
  id: t.integer('id').primaryKey(),
  name: t.text('name').notNull().unique(),
}))

export const battlesToParticipants = sqliteTable(
  'battles_to_participants',
  (t) => ({
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
