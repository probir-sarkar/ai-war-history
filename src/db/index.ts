import { env } from '#/env.ts'
import { drizzle } from 'drizzle-orm/libsql'
import { relations } from './schema'

export const db = drizzle({
  connection: {
    url: env.TURSO_CONNECTION_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  },
  relations: relations,
})
