import * as React from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { orpc } from '#/orpc/client.ts'
import { formatYear } from '#/lib/format.ts'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import {
  MapPin,
  Calendar,
  Users,
  Skull,
  Crown,
  Shield,
} from 'lucide-react'

export const Route = createFileRoute('/wars/$warId')({
  loader: async ({ params }) => {
    const result = await orpc.getWar.call({ warId: params.warId })
    if (!result) throw notFound()
    return result
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] }
    const battles = loaderData.battles
    const years = battles.map((b) => b.year)
    const minYear = years.length > 0 ? Math.min(...years) : null
    const maxYear = years.length > 0 ? Math.max(...years) : null

    return {
      meta: [
        { title: `${loaderData.name} (${minYear ? formatYear(minYear) : 'Unknown'}–${maxYear ? formatYear(maxYear) : 'Unknown'}) — War History Archive` },
        {
          name: 'description',
          content: `Comprehensive history of ${loaderData.name}, including ${battles.length} battles spanning ${minYear && maxYear ? maxYear - minYear : 0} years. Detailed records of participants, outcomes, and historical significance.`,
        },
        { property: 'og:title', content: loaderData.name },
        { property: 'og:description', content: `${battles.length} battles documented from ${minYear ? formatYear(minYear) : 'Unknown'} to ${maxYear ? formatYear(maxYear) : 'Unknown'}` },
        { property: 'og:type', content: 'article' },
        { name: 'keywords', content: `${loaderData.name}, war history, battles, military history, ${battles.slice(0, 5).map(b => b.winner?.name).filter(Boolean).join(', ')}` },
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
  const battles = war.battles
  const theaters = [
    ...new Set(battles.flatMap((b) => b.theatres ).filter(Boolean)),
  ]
  const [moreCombatantsOpen, setMoreCombatantsOpen] = React.useState(false)

  // Get year range from battles
  const years = battles.map((b) => b.year)
  const minYear = years.length > 0 ? Math.min(...years) : null
  const maxYear = years.length > 0 ? Math.max(...years) : null

  return (
    <article className="mx-auto max-w-4xl px-6 py-12">
      <Link
        to="/"
        className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/70 hover:underline"
      >
        ← Index
      </Link>

      <header className="mt-6 border-b border-foreground pb-10">
        <div className="font-mono text-xs tabular-nums text-foreground/70">
          {minYear && maxYear
            ? `${formatYear(minYear)} — ${formatYear(maxYear)}`
            : 'Unknown dates'}
        </div>
        <h1 className="font-serif text-5xl md:text-6xl mt-4 leading-none">
          {war.name}
        </h1>
      </header>

      {/* Stats grid */}
      <section className="grid md:grid-cols-3 gap-8 py-10 border-b border-border">
        <Stat label="Battles" value={`${battles.length}`} />
        <Stat
          label="Timespan"
          value={minYear && maxYear ? `${maxYear - minYear} yrs` : 'Unknown'}
        />
        <Stat
          label="Countries"
          value={
            new Set(
              battles.flatMap((b) =>
                [b.country?.name, b.winner?.name, b.loser?.name].filter(
                  Boolean,
                ),
              ),
            ).size
          }
        />
      </section>

      {/* Participants */}
      {battles.length > 0 &&
        (() => {
          const allCombatants = Array.from(
            new Set(
              battles.flatMap((b) =>
                [
                  b.country?.name,
                  b.winner?.name,
                  b.loser?.name,
                  ...b.participants.map((p) => p.name),
                ].filter(Boolean),
              ),
            ),
          )
          const defaultCount = 6
          const visibleCombatants = allCombatants.slice(0, defaultCount)
          const remainingCombatants = allCombatants.slice(defaultCount)
          const hasMore = remainingCombatants.length > 0

          return (
            <section className="py-10 border-b border-border">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/70 mb-6">
                Combatants ({allCombatants.length})
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
                      ? `Show less`
                      : `Show ${remainingCombatants.length} more`}
                  </CollapsibleTrigger>
                </Collapsible>
              )}
            </section>
          )
        })()}

      {/* Theatres */}
      {battles.length > 0 && (
        <section className="py-10 border-b border-border">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/70 mb-6">
            Theatres
          </h2>
          <div className="flex flex-wrap gap-2">
            {theaters.map((name) => (
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
          Battles ({battles.length})
        </h2>

        {battles.length === 0 ? (
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
                    <span className="inline-flex items-center gap-1.5" aria-label={`Year ${formatYear(b.year)}`}>
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
                    <span className="inline-flex items-center gap-1.5" aria-label={`Location: ${b.latitude.toFixed(2)}°N, ${b.longitude.toFixed(2)}°E`}>
                      <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                      {b.latitude.toFixed(2)}°N, {b.longitude.toFixed(2)}°E
                    </span>
                    {b.country && (
                      <span className="inline-flex items-center gap-1.5" aria-label={`Country: ${b.country.name}`}>
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
                        <span className="font-mono uppercase tracking-wider opacity-70">Winner:</span> {b.winner.name}
                      </span>
                    )}
                    {b.loser && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted/30 text-foreground/60 text-sm rounded-sm border border-border/50">
                        <span className="font-mono uppercase tracking-wider opacity-70">Loser:</span> {b.loser.name}
                      </span>
                    )}
                  </div>

                  {/* Participants */}
                  {b.participants.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1  text-sm rounded-sm border border-accent/40 font-medium">
                        <Users className="w-3.5 h-3.5" aria-hidden="true" />
                        <span className="font-mono uppercase tracking-wider opacity-70">Participants:</span>
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
