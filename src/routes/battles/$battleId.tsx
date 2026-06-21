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
          { title: `${loaderData.name} — War History Archive` },
          { name: 'description', content: `Battle of ${loaderData.name}` },
          { property: 'og:title', content: loaderData.name },
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
        <div className="flex items-center gap-4">
          <div className="font-mono text-xs tabular-nums text-muted-foreground">
            {formatYear(battle.year)}
          </div>
          {battle.massacre && (
            <span className="px-2 py-0.5 bg-destructive/10 text-destructive text-xs rounded-sm border border-[rgb(var(--color-destructive)/0.3)] font-mono uppercase tracking-widest">
              Massacre
            </span>
          )}
        </div>
        <h1 className="font-serif text-5xl md:text-6xl mt-4 leading-none">
          {battle.name}
        </h1>
        {battle.war && (
          <div className="mt-4">
            <Link
              to="/wars/$warId"
              params={{ warId: String(battle.war.id) }}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="font-mono text-xs uppercase tracking-[0.15em]">
                Part of
              </span>
              <span className="font-serif text-lg underline underline-offset-4 decoration-1">
                {battle.war.name}
              </span>
            </Link>
          </div>
        )}
      </header>

      {/* Stats grid */}
      <section className="grid md:grid-cols-4 gap-8 py-10 border-b border-border">
        <Stat label="Location" value={`${battle.latitude.toFixed(2)}°N, ${battle.longitude.toFixed(2)}°E`} />
        {battle.country && <Stat label="Country" value={battle.country.name} />}
        {battle.scale && <Stat label="Scale" value={String(battle.scale)} />}
        {battle.winner && <Stat label="Victor" value={battle.winner.name} />}
      </section>

      {/* Outcome */}
      {battle.winner && battle.loser && (
        <section className="py-10 border-b border-border">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6">
            Outcome
          </h2>
          <div className="grid md:grid-cols-2 gap-10">
            <SideBlock label="Victorious" winner={battle.winner} isVictor={true} />
            <SideBlock label="Defeated" loser={battle.loser} isVictor={false} />
          </div>
        </section>
      )}

      {/* Participants */}
      {battle.participants.length > 0 && (
        <section className="py-10 border-b border-border">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6">
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

      {/* Theatres */}
      {battle.theatres && battle.theatres.length > 0 && (
        <section className="py-10 border-b border-border">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6">
            Theatre{battle.theatres.length > 1 ? 's' : ''}
          </h2>
          <div className="flex flex-wrap gap-2">
            {battle.theatres.map((t) => (
              <span
                key={t}
                className="px-3 py-1 bg-accent/10 text-foreground text-sm rounded-sm border border-border"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="font-serif text-lg mt-1 leading-snug">{value}</div>
    </div>
  )
}

function SideBlock({
  label,
  winner,
  loser,
  isVictor,
}: {
  label: string
  winner?: { name: string }
  loser?: { name: string }
  isVictor: boolean
}) {
  const entity = winner || loser
  if (!entity) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
        {isVictor && (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] border border-[rgb(var(--color-success))] text-[rgb(var(--color-success))] px-2 py-0.5">
            Victor
          </span>
        )}
      </div>
      <p className="font-serif text-2xl leading-snug">{entity.name}</p>
    </div>
  )
}
