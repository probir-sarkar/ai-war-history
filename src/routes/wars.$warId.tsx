import * as React from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { orpc } from '#/orpc/client.ts'
import { formatYear } from '#/lib/format.ts'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'

export const Route = createFileRoute('/wars/$warId')({
  loader: async ({ params }) => {
    const result = await orpc.getWar.call({ warId: params.warId })
    if (!result) throw notFound()
    return result
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — War History Archive` },
          { name: 'description', content: `${loaderData.name} and its battles` },
          { property: 'og:title', content: loaderData.name },
        ]
      : [],
  }),
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
  const battles = war.battles ?? []
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
          {minYear && maxYear ? `${formatYear(minYear)} — ${formatYear(maxYear)}` : 'Unknown dates'}
        </div>
        <h1 className="font-serif text-5xl md:text-6xl mt-4 leading-none">{war.name}</h1>
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
              battles.flatMap((b) => [
                b.country?.name,
                b.winner?.name,
                b.loser?.name,
              ].filter(Boolean)),
            ).size
          }
        />
      </section>

      {/* Participants */}
      {battles.length > 0 && (() => {
        const allCombatants = Array.from(
          new Set(
            battles.flatMap((b) => [
              b.country?.name,
              b.winner?.name,
              b.loser?.name,
              ...b.participants.map((p) => p.name),
            ].filter(Boolean)),
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
              <Collapsible open={moreCombatantsOpen} onOpenChange={setMoreCombatantsOpen}>
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
                  {moreCombatantsOpen ? `Show less` : `Show ${remainingCombatants.length} more`}
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
            {Array.from(
              new Set(battles.flatMap((b) => b.theatres.map((t) => t.name))),
            ).map((name) => (
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
          <ol className="space-y-0">
            {battles.map((b, i) => (
              <li
                key={b.id}
                className="grid grid-cols-12 gap-4 py-5 border-t border-border"
              >
                <div className="col-span-2 font-mono text-xs tabular-nums pt-1">
                  <Link
                    to="/$year"
                    params={{ year: String(b.year) }}
                    className="hover:underline hover:text-accent transition-colors"
                  >
                    {formatYear(b.year)}
                  </Link>
                </div>
                <div className="col-span-10">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-serif text-xl">
                      <span className="text-foreground/70 mr-3 font-mono text-xs">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <Link
                        to="/battles/$battleId"
                        params={{ battleId: String(b.id) }}
                        className="hover:underline underline-offset-4 decoration-1"
                      >
                        {b.name}
                      </Link>
                    </h3>
                    {b.winner && (
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#16a34a] whitespace-nowrap">
                        {b.winner.name}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-foreground/70 mt-1">
                    {b.latitude.toFixed(2)}°N, {b.longitude.toFixed(2)}°E
                    {b.country && <span> · {b.country.name}</span>}
                  </div>
                  {b.massacre && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-destructive/20 text-destructive text-xs rounded-sm border border-destructive/40 font-mono uppercase tracking-widest">
                      Massacre
                    </span>
                  )}
                </div>
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
