import { relations } from './relations'
import * as schema from './schema'
import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from '#/env'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

export const db = drizzle({
  schema,
  relations,
  client: pool,
})
