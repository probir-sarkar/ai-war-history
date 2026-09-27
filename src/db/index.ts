import { relations } from './relations'
import * as schema from './schema'
import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from 'cloudflare:workers'

export const getDb = () => {
  return drizzle({
    schema,
    relations,
    connection: env.HYPERDRIVE.connectionString,
  })
}
