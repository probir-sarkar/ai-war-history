import { pgEnum, pgTable, primaryKey, unique } from 'drizzle-orm/pg-core'

export const theatresEnum = pgEnum('theatres', ['Air', 'Land', 'Sea'])
export const battles = pgTable(
  'battles',
  (t) => ({
    id: t.serial().primaryKey(),
    name: t.text('name').notNull(),
    year: t.integer('year').notNull(),
    latitude: t.real('latitude').notNull(),
    longitude: t.real('longitude').notNull(),
    scale: t.integer('scale'),
    massacre: t.boolean(),
    theatres: theatresEnum('theatres').array(),
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

export const wars = pgTable('wars', (t) => ({
  id: t.serial().primaryKey(),
  name: t.text('name').notNull().unique(),
}))

export const countries = pgTable('countries', (t) => ({
  id: t.serial().primaryKey(),
  name: t.text('name').notNull().unique(),
}))

export const participants = pgTable('participants', (t) => ({
  id: t.serial().primaryKey(),
  name: t.text('name').notNull().unique(),
}))

export const battlesToParticipants = pgTable(
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
