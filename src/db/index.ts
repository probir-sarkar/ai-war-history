import { drizzle } from 'drizzle-orm/libsql'
import { relations } from './relations'
import * as schema from './schema'
import { env } from '#/env.ts'

export const db = drizzle({
  connection: {
    url: env.TURSO_CONNECTION_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  },
  relations: relations,
  schema: schema,
})
