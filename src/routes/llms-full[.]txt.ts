import '#/polyfill'

import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '#/db/index.ts'
import { battles, wars } from '#/db/schema.ts'
import { formatYear } from '#/lib/format.ts'
import { SITE_URL } from '#/lib/site.ts'

async function handle() {
  const db = getDb()

  const [warRows, battleRows] = await Promise.all([
    db.select({ id: wars.id, name: wars.name }).from(wars).orderBy(wars.id),
    db
      .select({ id: battles.id, name: battles.name, year: battles.year })
      .from(battles)
      .orderBy(battles.year, battles.id),
  ])

  const body = `# War History Archive — full corpus

> ${warRows.length} wars and ${battleRows.length} battles, listed in full below. Battle names are rendered as "Battle of <name>"; years are AD unless suffixed BC. Each line links to the page with that entry's structured data (coordinates, participants, outcome, parent war).

Compact index: ${SITE_URL}/llms.txt — URL index: ${SITE_URL}/sitemap.xml

## Wars

${warRows.map((w) => `- [${w.name}](${SITE_URL}/wars/${w.id})`).join('\n')}

## Battles

${battleRows.map((b) => `- [Battle of ${b.name} (${formatYear(b.year)})](${SITE_URL}/battles/${b.id})`).join('\n')}
`

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  })
}

export const Route = createFileRoute('/llms-full.txt')({
  server: {
    handlers: {
      GET: handle,
      HEAD: handle,
    },
  },
})
