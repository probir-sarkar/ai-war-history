import { relations } from './relations';
import * as schema from './schema';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '#/env';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { readFileSync } from 'node:fs';

const ca = readFileSync(new URL('./ca.pem', import.meta.url), 'utf8')


const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: ca,
  },
})

export const db = drizzle({
  schema,
  relations,
  client: pool,
})
