import { relations } from './relations'
import * as schema from './schema'
import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from 'cloudflare:workers'
import { Pool } from 'pg'

export const getDb = () => {
  // One pool per request: Hyperdrive multiplexes and pools on our behalf,
  // and long-lived worker sockets go stale between requests.
  const pool = new Pool({
    // Local Hyperdrive passes the origin string through with
    // sslmode=require, which node-postgres resolves to full chain
    // verification and fails on the self-signed origin CA. TLS to the
    // origin is Hyperdrive's job, so chain verification is off either way.
    connectionString: env.HYPERDRIVE.connectionString.replace(
      /([?&])sslmode=require(&|$)/,
      '$1sslmode=no-verify$2',
    ),
    max: 5,
  })
  return drizzle({
    schema,
    relations,
    client: pool,
  })
}
