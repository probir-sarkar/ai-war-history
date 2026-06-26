import { relations } from './relations'
import * as schema from './schema'
import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from 'cloudflare:workers'
import { Pool } from 'pg'

export const getDb = () => {
  const pool = new Pool({
    connectionString: env.HYPERDRIVE.connectionString,
  })
  return drizzle({
    schema,
    relations,
    client: pool,
  })
}
