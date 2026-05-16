import { env } from '#/env.ts'
import { drizzle } from 'drizzle-orm/libsql'

export const db = drizzle({
  connection: {
    url: env.TURSO_CONNECTION_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  },
})
