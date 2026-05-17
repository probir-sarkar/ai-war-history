import { orpc } from '#/orpc/client.ts'
import { createFileRoute, Link } from '@tanstack/react-router'
import { MapPin, Trophy, ShieldX, Mountain, Cloud, Waves, Skull } from 'lucide-react'

export const Route = createFileRoute('/$year/')({
  loader: async ({ params }) =>
    await orpc.listBattles.call({ year: params.year }),
  head: ({ params }) => ({
    meta: [
      { title: `${params.year} — War History Archive` },
      {
        name: 'description',
        content: `Battles and conflicts from the year ${params.year}.`,
      },
    ],
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const battles = Route.useLoaderData()
  const { year } = Route.useParams()

  return (
    <div className="min-h-screen ">
      {/* Page Header */}
      <header className="border-b border-accent bg-background">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-baseline gap-4">
            <h1 className="text-4xl md:text-5xl text-foreground tracking-tight font-serif">
              {year}
            </h1>
            <span className="text-foreground/70 text-lg font-light">
              {battles.length} {battles.length === 1 ? 'Battle' : 'Battles'}
            </span>
          </div>
        </div>
      </header>

      {/* Battles Grid */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {battles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-foreground/70 text-lg">
              No battles recorded for this year
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {battles.map((battle) => (
              <BattleCard key={battle.id} battle={battle} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-5xl mx-auto px-6 py-8 text-center text-foreground/70 text-sm">
          <p>A record of conflict throughout history</p>
        </div>
      </footer>
    </div>
  )
}

function BattleCard({ battle }: { battle: Awaited<ReturnType<typeof orpc.listBattles>>[number] }) {
  const theatreIcon = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.includes('land') || lower.includes('ground')) return <Mountain className="w-4 h-4" />
    if (lower.includes('air') || lower.includes('aerial')) return <Cloud className="w-4 h-4" />
    if (lower.includes('sea') || lower.includes('naval') || lower.includes('marine')) return <Waves className="w-4 h-4" />
    return null
  }

  return (
    <article className="group bg-background border border-border rounded-lg hover:border-accent/50 transition-all duration-200 overflow-hidden">
      <div className="p-5">
        {/* Header: Name + Outcome */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link
              to="/battles/$battleId"
              params={{ battleId: String(battle.id) }}
              className="font-serif text-xl text-foreground group-hover:text-accent transition-colors block"
            >
              {battle.name}
            </Link>
            {battle.war && (
              <Link
                to="/wars/$warId"
                params={{ warId: String(battle.war.id) }}
                className="text-foreground/60 text-sm hover:text-accent transition-colors"
              >
                {battle.war.name}
              </Link>
            )}
          </div>

          {/* Outcome */}
          <div className="flex flex-col items-end gap-1 text-xs">
            {battle.winner && (
              <div className="flex items-center gap-1.5 text-[#16a34a]">
                <Trophy className="w-3.5 h-3.5" />
                <span className="font-medium">{battle.winner.name}</span>
              </div>
            )}
            {battle.loser && (
              <div className="flex items-center gap-1.5 text-destructive">
                <ShieldX className="w-3.5 h-3.5" />
                <span>{battle.loser.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Meta info row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-foreground/60 text-sm">
          {/* Location */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>{battle.latitude.toFixed(1)}°N, {battle.longitude.toFixed(1)}°E</span>
            {battle.country && <span>· {battle.country.name}</span>}
          </div>

          {/* Theatres as icons with text */}
          {battle.theatres.length > 0 && (
            <div className="flex items-center gap-3 text-accent">
              {battle.theatres.map((t) => (
                <div key={t.id} className="flex items-center gap-1 text-sm font-medium">
                  {theatreIcon(t.name)}
                  <span>{t.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Scale */}
          {battle.scale && (
            <span className="text-foreground/60">{battle.scale}</span>
          )}

          {/* Massacre */}
          {battle.massacre && (
            <span className="flex items-center gap-1 text-destructive font-medium">
              <Skull className="w-3.5 h-3.5" />
              <span>Massacre</span>
            </span>
          )}
        </div>

        {/* Participants */}
        {battle.participants.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {battle.participants.map((p: { id: number; name: string }) => (
              <span
                key={p.id}
                className="px-2 py-0.5 bg-muted text-foreground/80 text-xs rounded-md border border-border"
              >
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
