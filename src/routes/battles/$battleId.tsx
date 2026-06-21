import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { orpc } from '#/orpc/client.ts'
import { formatYear } from '#/lib/format.ts'

export const Route = createFileRoute('/battles/$battleId')({
  loader: async ({ params }) => {
    const result = await orpc.getBattle.call({ battleId: params.battleId })
    if (!result) throw notFound()
    return result
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `Battle of ${loaderData.name} (${loaderData.year}) — War History Archive` },
          { name: 'description', content: `Battle of ${loaderData.name}, ${loaderData.year}${loaderData.war ? `. Part of the ${loaderData.war.name}.` : ''}${loaderData.winner ? ` Victor: ${loaderData.winner.name}.` : ''}` },
          { property: 'og:title', content: `Battle of ${loaderData.name}` },
        ]
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

  return (
    <article className="mx-auto max-w-4xl px-6 py-12">
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
            <span className="px-2 py-0.5 bg-destructive/10 text-destructive text-xs rounded-sm border border-[rgb(var(--color-destructive)/0.3)] font-mono uppercase tracking-widest">
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
                    <span className="font-serif text-xl">{battle.winner.name}</span>
                  </div>
                )}
                {battle.winner && battle.loser && <span className="text-muted-foreground">vs</span>}
                {battle.loser && (
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-1">
                      Defeated
                    </span>
                    <span className="font-serif text-xl">{battle.loser.name}</span>
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
        <div className="font-serif text-lg">
          {battle.latitude.toFixed(4)}°N, {battle.longitude.toFixed(4)}°E
        </div>
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
    </article>
  )
}
