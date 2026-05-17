import { relations } from './relations'
import * as schema from './schema'
import { drizzle } from 'drizzle-orm/postgres-js'
import { env } from '#/env.ts'
import postgres from 'postgres'

const queryClient = postgres(env.DATABASE_URL)

export const db = drizzle({ client: queryClient, schema, relations })
