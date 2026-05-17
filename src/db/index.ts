import { relations } from './relations'
import * as schema from './schema'
import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from '#/env.ts'

export const db = drizzle(env.DATABASE_URL, {
  schema,
  relations,
})
