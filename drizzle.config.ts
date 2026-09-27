import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'
import fs from 'node:fs'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
      ca: fs.readFileSync('./certs/ca.pem'),
    },
  },
  migrations: {
    schema: 'public',
  },
})
