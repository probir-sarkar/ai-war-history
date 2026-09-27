import '#/polyfill'

import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '#/db/index.ts'
import { battles, wars } from '#/db/schema.ts'
import { SITE_URL } from '#/lib/site.ts'

async function handle() {
  const db = getDb()
  const [warCount, battleCount] = await Promise.all([
    db.$count(wars),
    db.$count(battles),
  ])

  const body = `# War History Archive

> A chronological record of armed conflict throughout history: ${warCount} wars and ${battleCount} battles. Every battle entry is dated (negative years are BC), geo-located, tied to its parent war, and records participants plus the outcome (victor and defeated side). Battle names in the database are short forms; the site and structured data render them as "Battle of <name>".

All pages are server-rendered HTML with schema.org JSON-LD structured data (WebSite, ItemList, BreadcrumbList, Event) in the document head. A plain-text dump of the whole corpus is at ${SITE_URL}/llms-full.txt and a machine index of every URL at ${SITE_URL}/sitemap.xml.

## Indexes

- [Wars](${SITE_URL}/): all ${warCount} wars, paginated; filter by name with ?q=<war name>
- [Battles](${SITE_URL}/battles): all ${battleCount} battles with year, location, participants, and parent war
- [Battles by year](${SITE_URL}/-216): battles fought in a given year; negative years are BC (e.g. /216 is 216 AD, /-216 is 216 BC)

## Data model

- War page: ${SITE_URL}/wars/{id} — name, battle count, timespan, combatants, theatres, and its battles
- Battle page: ${SITE_URL}/battles/{id} — name, year, coordinates, country, theatres, massacre flag, scale, participants, victor, defeated side, parent war
- Year page: ${SITE_URL}/{year} — every battle fought that year

## API

- [OpenAPI reference](${SITE_URL}/api): machine-readable listing of the JSON endpoints backing the site (list, filter, and detail operations for wars and battles)
`

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  })
}

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: handle,
      HEAD: handle,
    },
  },
})
