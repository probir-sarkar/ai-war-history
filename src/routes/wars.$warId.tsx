import * as React from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { orpc } from '#/orpc/client.ts'
import { useQuery } from '@tanstack/react-query'
import { formatYear, formatLatitude, formatLongitude } from '#/lib/format.ts'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import { Pagination } from '#/components/pagination.tsx'
import { parsePageParam } from '#/lib/pagination.ts'
import { absoluteUrl } from '#/lib/site.ts'
import type { PageSearch } from '#/lib/pagination.ts'
import { MapPin, Calendar, Users, Skull, Crown, Shield } from 'lucide-react'

const PAGE_SIZE = 24

export const Route = createFileRoute('/wars/$warId')({
  validateSearch: (search: Record<string, unknown>): PageSearch => ({
    page: parsePageParam(search),
  }),
  loaderDeps: ({ search: { page } }) => ({ page: page ?? 1 }),
  loader: async ({ context, params, deps }) => {
    if (!/^\d+$/.test(params.warId)) throw notFound()
    const war = await orpc.getWar.call({ warId: params.warId })
    if (!war) throw notFound()
    await context.queryClient.ensureQueryData(
      orpc.listAllBattles.queryOptions({
        input: {
          warId: Number(params.warId),
          page: deps.page,
          pageSize: PAGE_SIZE,
        },
      }),
    )
    return war
  },
  head: ({ loaderData, params, match }) => {
    if (!loaderData) return { meta: [] }
    const { stats } = loaderData
    const span =
      stats.minYear !== null && stats.maxYear !== null
        ? `${formatYear(stats.minYear)}–${formatYear(stats.maxYear)}`
        : 'unknown dates'

    return {
      meta: [
        {
          title: `${loaderData.name} (${span}) — War History Archive`,
        },
        {
          name: 'description',
          content: `History of ${loaderData.name}: ${stats.battleCount} battles from ${span}, with combatants, theatres, locations, and outcomes.`,
        },
        { property: 'og:title', content: loaderData.name },
        {
          property: 'og:description',
          content: `${stats.battleCount} battles documented, ${span}.`,
        },
        { property: 'og:type', content: 'article' },
        {
          property: 'og:url',
          content: absoluteUrl(`/wars/${params.warId}`, match.search.page),
        },
      ],
      links: [
        {
          rel: 'canonical',
          href: absoluteUrl(`/wars/${params.warId}`, match.search.page),
        },
      ],
    }
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="font-serif text-4xl">Entry not found</h1>
      <Link
        to="/"
        className="font-mono text-xs uppercase tracking-[0.2em] underline mt-6 inline-block"
      >
        Back to index
      </Link>
    </div>
  ),
  component: WarDetail,
})

function WarDetail() {
  const war = Route.useLoaderData()
  const { warId } = Route.useParams()
  const { page: pageParam } = Route.useSearch()
  const page = pageParam ?? 1
  const navigate = Route.useNavigate()
  const { stats } = war

  const battlesQuery = useQuery(
    orpc.listAllBattles.queryOptions({
      input: { warId: Number(warId), page, pageSize: PAGE_SIZE },
    }),
  )

  const battles = battlesQuery.data?.items ?? []
  const totalPages = battlesQuery.data?.totalPages ?? 1

  const [moreCombatantsOpen, setMoreCombatantsOpen] = React.useState(false)

  const handlePageChange = (newPage: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: newPage === 1 ? undefined : newPage,
      }),
    })
  }

  const span =
    stats.minYear !== null && stats.maxYear !== null
      ? `${formatYear(stats.minYear)} — ${formatYear(stats.maxYear)}`
      : 'Unknown dates'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: war.name,
    description: `${stats.battleCount} battles documented, ${span}.`,
    isPartOf: { '@type': 'WebSite', name: 'War History Archive' },
  }

  return (
    <article className="mx-auto max-w-4xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        to="/"
        className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/70 hover:underline"
      >
        ← Index
      </Link>

      <header className="mt-6 border-b border-foreground pb-10">
        <div className="font-mono text-xs tabular-nums text-foreground/70">
          {span}
        </div>
        <h1 className="font-serif text-5xl md:text-6xl mt-4 leading-none">
          {war.name}
        </h1>
      </header>

      {/* Stats grid */}
      <section className="grid md:grid-cols-3 gap-8 py-10 border-b border-border">
        <Stat label="Battles" value={stats.battleCount} />
        <Stat
          label="Timespan"
          value={
            stats.minYear !== null && stats.maxYear !== null
              ? `${stats.maxYear - stats.minYear} yrs`
              : 'Unknown'
          }
        />
        <Stat label="Combatants" value={stats.combatants.length} />
      </section>

      {/* Combatants */}
      {stats.combatants.length > 0 &&
        (() => {
          const defaultCount = 6
          const visibleCombatants = stats.combatants.slice(0, defaultCount)
          const remainingCombatants = stats.combatants.slice(defaultCount)
          const hasMore = remainingCombatants.length > 0

          return (
            <section className="py-10 border-b border-border">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/70 mb-6">
                Combatants ({stats.combatants.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {visibleCombatants.map((name) => (
                  <span
                    key={name}
                    className="px-3 py-1 bg-accent/20 text-foreground text-sm rounded-sm border border-border"
                  >
                    {name}
                  </span>
                ))}
              </div>
              {hasMore && (
                <Collapsible
                  open={moreCombatantsOpen}
                  onOpenChange={setMoreCombatantsOpen}
                >
                  <CollapsibleContent className="mt-2">
                    <div className="flex flex-wrap gap-2">
                      {remainingCombatants.map((name) => (
                        <span
                          key={name}
                          className="px-3 py-1 bg-accent/20 text-foreground text-sm rounded-sm border border-border"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </CollapsibleContent>
                  <CollapsibleTrigger className="mt-4 font-mono text-xs text-foreground/70 hover:text-foreground transition-colors cursor-pointer underline decoration-dotted underline-offset-4">
                    {moreCombatantsOpen
                      ? 'Show less'
                      : `Show ${remainingCombatants.length} more`}
                  </CollapsibleTrigger>
                </Collapsible>
              )}
            </section>
          )
        })()}

      {/* Theatres */}
      {stats.theatres.length > 0 && (
        <section className="py-10 border-b border-border">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/70 mb-6">
            Theatres
          </h2>
          <div className="flex flex-wrap gap-2">
            {stats.theatres.map((name) => (
              <span
                key={name}
                className="px-3 py-1 bg-background text-foreground text-sm rounded-sm border border-border"
              >
                {name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Battles */}
      <section className="py-10">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/70 mb-6">
          Battles ({stats.battleCount})
        </h2>

        {stats.battleCount === 0 ? (
          <p className="text-foreground/70 text-sm">
            No battles indexed for this war.
          </p>
        ) : (
          <ol className="grid gap-4" aria-label="List of battles">
            {battles.map((b, i) => (
              <li
                key={b.id}
                className="group relative border border-border rounded-lg overflow-hidden hover:border-accent/50 transition-colors"
              >
                <Link
                  to="/battles/$battleId"
                  params={{ battleId: String(b.id) }}
                  className="block p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`View details for ${b.name}`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="font-mono text-xs text-foreground/50 tabular-nums"
                        aria-hidden="true"
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="font-serif text-xl leading-tight group-hover:underline underline-offset-4 decoration-1">
                        {b.name}
                      </h3>
                    </div>
                    {b.massacre && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-destructive/10 text-destructive text-xs rounded-sm border border-destructive/30 font-mono uppercase tracking-wider shrink-0"
                        aria-label="Marked as massacre"
                      >
                        <Skull className="w-3.5 h-3.5" aria-hidden="true" />
                        Massacre
                      </span>
                    )}
                  </div>

                  {/* Meta info row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-foreground/60 mb-3">
                    <span
                      className="inline-flex items-center gap-1.5"
                      aria-label={`Year ${formatYear(b.year)}`}
                    >
                      <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                      <Link
                        to="/$year"
                        params={{ year: String(b.year) }}
                        className="hover:text-foreground transition-colors tabular-nums"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Filter by year ${formatYear(b.year)}`}
                      >
                        {formatYear(b.year)}
                      </Link>
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5"
                      aria-label={`Location: ${formatLatitude(b.latitude, 2)}, ${formatLongitude(b.longitude, 2)}`}
                    >
                      <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                      {formatLatitude(b.latitude, 2)},{' '}
                      {formatLongitude(b.longitude, 2)}
                    </span>
                    {b.country && (
                      <span
                        className="inline-flex items-center gap-1.5"
                        aria-label={`Country: ${b.country.name}`}
                      >
                        <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                        {b.country.name}
                      </span>
                    )}
                  </div>

                  {/* Winner/Loser */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {b.winner && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-success/10 text-success text-sm rounded-sm border border-success/30 font-medium">
                        <Crown className="w-3.5 h-3.5" aria-hidden="true" />
                        <span className="font-mono uppercase tracking-wider opacity-70">
                          Winner:
                        </span>{' '}
                        {b.winner.name}
                      </span>
                    )}
                    {b.loser && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted/30 text-foreground/60 text-sm rounded-sm border border-border/50">
                        <span className="font-mono uppercase tracking-wider opacity-70">
                          Loser:
                        </span>{' '}
                        {b.loser.name}
                      </span>
                    )}
                  </div>

                  {/* Participants */}
                  {b.participants.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-sm border border-accent/40 font-medium">
                        <Users className="w-3.5 h-3.5" aria-hidden="true" />
                        <span className="font-mono uppercase tracking-wider opacity-70">
                          Participants:
                        </span>
                      </span>
                      {b.participants.map((p) => (
                        <span
                          key={p.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 text-foreground/70 text-sm rounded-sm border border-accent/30"
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </section>
    </article>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70">
        {label}
      </div>
      <div className="font-serif text-lg mt-1 leading-snug">{value}</div>
    </div>
  )
}
