import '#/polyfill'

import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '#/db/index.ts'
import { battles, wars } from '#/db/schema.ts'
import { SITE_URL } from '#/lib/site.ts'

async function handle() {
  const origin = SITE_URL
  const db = getDb()

  const [warRows, battleRows, yearRows] = await Promise.all([
    db.select({ id: wars.id }).from(wars).orderBy(wars.id),
    db.select({ id: battles.id }).from(battles).orderBy(battles.id),
    db
      .select({ year: battles.year })
      .from(battles)
      .groupBy(battles.year)
      .orderBy(battles.year),
  ])

  const urls = [
    `${origin}/`,
    `${origin}/battles`,
    ...warRows.map((w) => `${origin}/wars/${w.id}`),
    ...battleRows.map((b) => `${origin}/battles/${b.id}`),
    ...yearRows.map((y) => `${origin}/${y.year}`),
  ]

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((loc) => `  <url><loc>${loc}</loc></url>`).join('\n') +
    '\n</urlset>\n'

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  })
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: handle,
      HEAD: handle,
    },
  },
})
