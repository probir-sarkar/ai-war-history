import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { orpc } from '#/orpc/client.ts'
import { useQuery } from '@tanstack/react-query'
import { formatYear, formatLatitude, formatLongitude } from '#/lib/format.ts'
import { absoluteUrl } from '#/lib/site.ts'
import { ArrowUpRight } from 'lucide-react'

const RELATED_COUNT = 6

export const Route = createFileRoute('/battles/$battleId')({
  loader: async ({ context, params }) => {
    if (!/^\d+$/.test(params.battleId)) throw notFound()
    const result = await orpc.getBattle.call({ battleId: params.battleId })
    if (!result) throw notFound()

    // Prefetch same-war battles so the related section renders with the page.
    if (result.war) {
      await context.queryClient.ensureQueryData(
        orpc.listAllBattles.queryOptions({
          input: { warId: result.war.id, page: 1, pageSize: 24 },
        }),
      )
    }
    return result
  },
  head: ({ loaderData, params }) => ({
    meta: loaderData
      ? [
          {
            title: `Battle of ${loaderData.name} (${loaderData.year}) — War History Archive`,
          },
          {
            name: 'description',
            content: `Battle of ${loaderData.name}, ${loaderData.year}${loaderData.war ? `. Part of the ${loaderData.war.name}.` : ''}${loaderData.winner ? ` Victor: ${loaderData.winner.name}.` : ''}`,
          },
          { property: 'og:title', content: `Battle of ${loaderData.name}` },
          { property: 'og:type', content: 'article' },
          {
            property: 'og:url',
            content: absoluteUrl(`/battles/${params.battleId}`),
          },
        ]
      : [],
    links: loaderData
      ? [{ rel: 'canonical', href: absoluteUrl(`/battles/${params.battleId}`) }]
      : [],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="font-serif text-4xl">Entry not found</h1>
      <Link
        to="/battles"
        className="font-mono text-xs uppercase tracking-[0.2em] underline mt-6 inline-block"
      >
        Back to battles
      </Link>
    </div>
  ),
  component: BattleDetail,
})

function BattleDetail() {
  const battle = Route.useLoaderData()

  const relatedQuery = useQuery({
    ...orpc.listAllBattles.queryOptions({
      input: { warId: battle.war?.id ?? 0, page: 1, pageSize: 24 },
    }),
    // Warless battles have no related section; skip the fetch entirely.
    enabled: battle.war !== null,
  })

  const related = (relatedQuery.data?.items ?? [])
    .filter((b) => b.id !== battle.id)
    .slice(0, RELATED_COUNT)

  const mapUrl = `https://www.openstreetmap.org/?mlat=${battle.latitude}&mlon=${battle.longitude}#map=9/${battle.latitude}/${battle.longitude}`

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Wars',
        item: absoluteUrl('/'),
      },
      ...(battle.war
        ? [
            {
              '@type': 'ListItem',
              position: 2,
              name: battle.war.name,
              item: absoluteUrl(`/wars/${battle.war.id}`),
            },
          ]
        : []),
      {
        '@type': 'ListItem',
        position: battle.war ? 3 : 2,
        name: `Battle of ${battle.name}`,
        item: absoluteUrl(`/battles/${battle.id}`),
      },
    ],
  }

  const eventLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: `Battle of ${battle.name}`,
    ...(battle.year > 0 ? { startDate: String(battle.year) } : {}),
    location: {
      '@type': 'Place',
      ...(battle.country ? { name: battle.country.name } : {}),
      geo: {
        '@type': 'GeoCoordinates',
        latitude: battle.latitude,
        longitude: battle.longitude,
      },
    },
  }

  return (
    <article className="mx-auto max-w-4xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd) }}
      />

      <Link
        to="/battles"
        className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:underline"
      >
        ← Battles
      </Link>

      <header className="mt-6 border-b border-foreground pb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="font-mono text-xs tabular-nums text-muted-foreground">
            {formatYear(battle.year)}
          </div>
          {battle.massacre && (
            <span className="px-2 py-0.5 bg-destructive/10 text-destructive text-xs rounded-sm border border-destructive/30 font-mono uppercase tracking-widest">
              Massacre
            </span>
          )}
          {battle.theatres && battle.theatres.length > 0 && (
            <div className="flex items-center gap-1.5">
              {battle.theatres.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 bg-accent/10 text-foreground text-xs rounded-sm border border-border font-mono uppercase tracking-wider"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <h1 className="font-serif text-5xl md:text-6xl leading-none">
          Battle of {battle.name}
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {battle.country && (
            <span className="font-serif">{battle.country.name}</span>
          )}
          {battle.country && battle.war && <span>•</span>}
          {battle.war && (
            <Link
              to="/wars/$warId"
              params={{ warId: String(battle.war.id) }}
              className="hover:text-foreground underline underline-offset-4 decoration-1 transition-colors"
            >
              {battle.war.name}
            </Link>
          )}
          {battle.scale && (
            <>
              {(battle.country || battle.war) && <span>•</span>}
              <span className="font-mono text-xs uppercase tracking-[0.15em]">
                Scale: {battle.scale}
              </span>
            </>
          )}
        </div>

        {(battle.winner || battle.loser) && (
          <div className="mt-8 p-5 bg-muted/30 rounded-sm border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                {battle.winner && (
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-1">
                      Victor
                    </span>
                    <span className="font-serif text-xl">
                      {battle.winner.name}
                    </span>
                  </div>
                )}
                {battle.winner && battle.loser && (
                  <span className="text-muted-foreground">vs</span>
                )}
                {battle.loser && (
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-1">
                      Defeated
                    </span>
                    <span className="font-serif text-xl">
                      {battle.loser.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Coordinates */}
      <section className="py-8 border-b border-border">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Coordinates
        </div>
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-serif text-lg underline decoration-1 underline-offset-4 hover:decoration-foreground"
          aria-label={`View Battle of ${battle.name} on OpenStreetMap`}
        >
          {formatLatitude(battle.latitude, 4)},{' '}
          {formatLongitude(battle.longitude, 4)}
          <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
        </a>
      </section>

      {/* Participants */}
      {battle.participants.length > 0 && (
        <section className="py-8 border-b border-border">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">
            Participants ({battle.participants.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {battle.participants.map((p) => (
              <span
                key={p.id}
                className="px-3 py-1 bg-background text-foreground text-sm rounded-sm border border-border"
              >
                {p.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Related battles from the same war */}
      {battle.war && related.length > 0 && (
        <section className="py-8">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">
            More from {battle.war.name}
          </h2>
          <ul className="divide-y divide-border border-y border-border">
            {related.map((b) => (
              <li key={b.id}>
                <Link
                  to="/battles/$battleId"
                  params={{ battleId: String(b.id) }}
                  className="flex items-baseline justify-between gap-4 py-3 hover:bg-accent/5 transition-colors group"
                >
                  <span className="font-serif text-lg group-hover:underline underline-offset-4 decoration-1">
                    {b.name}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-foreground/70 shrink-0">
                    {formatYear(b.year)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to="/wars/$warId"
            params={{ warId: String(battle.war.id) }}
            className="inline-block mt-4 font-mono text-xs uppercase tracking-[0.2em] underline underline-offset-4 decoration-1"
          >
            View all battles →
          </Link>
        </section>
      )}
    </article>
  )
}
