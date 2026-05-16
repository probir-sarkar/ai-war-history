import { defineRelations } from 'drizzle-orm'
import { sqliteTable } from 'drizzle-orm/sqlite-core'

export const battles = sqliteTable('battles', (t) => ({
  id: t.integer('id').primaryKey({ autoIncrement: true }),
  name: t.integer('name').notNull().unique(),
  year: t.integer('year').notNull(),
  latitute: t.real('latitute').notNull(),
  warId: t
    .integer('war_id')
    .notNull()
    .references(() => wars.id),
}))

export const wars = sqliteTable('wars', (t) => ({
  id: t.integer('id').primaryKey({ autoIncrement: true }),
  name: t.integer('name').notNull(),
}))

export const relations = defineRelations({ battles, wars }, (r) => ({
  battles: {
    war: r.one.wars({
      from: r.battles.warId,
      to: r.wars.id,
    }),
  },
  wars: {
    battles: r.many.battles(),
  },
}))
