import { orpc } from '#/orpc/client.ts'
import { createFileRoute, Link } from '@tanstack/react-router'

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
    <div className="min-h-screen bg-[rgb(var(--color-background))]">
      {/* Page Header */}
      <header className="border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))]">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-baseline gap-4">
            <h1 className="text-4xl md:text-5xl text-[rgb(var(--color-foreground))] tracking-tight font-serif">
              {year}
            </h1>
            <span className="text-[rgb(var(--color-muted))] text-lg font-light">
              {battles.length} {battles.length === 1 ? 'Battle' : 'Battles'}
            </span>
          </div>
        </div>
      </header>

      {/* Battles Grid */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {battles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[rgb(var(--color-muted))] text-lg">
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
      <footer className="border-t border-[rgb(var(--color-border))] mt-16">
        <div className="max-w-5xl mx-auto px-6 py-8 text-center text-[rgb(var(--color-muted))] text-sm">
          <p>A record of conflict throughout history</p>
        </div>
      </footer>
    </div>
  )
}

function BattleCard({ battle }: { battle: Awaited<ReturnType<typeof orpc.listBattles>>[number] }) {
  return (
    <article className="group bg-[rgb(var(--color-background)_/_0.5)] rounded-sm border border-[rgb(var(--color-border))] shadow-sm hover:shadow-md hover:border-[rgb(var(--color-foreground)_/_0.3)] transition-all duration-200 overflow-hidden">
      <div className="p-6">
        {/* Battle Name & War */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <Link
              to="/battles/$battleId"
              params={{ battleId: String(battle.id) }}
              className="font-serif text-xl text-[rgb(var(--color-foreground))] group-hover:text-[rgb(var(--color-accent))] transition-colors"
            >
              {battle.name}
            </Link>
            {battle.war && (
              <p className="text-[rgb(var(--color-muted))] text-sm mt-1">
                <span className="font-medium">War:</span>{' '}
                <Link
                  to="/wars/$warId"
                  params={{ warId: String(battle.war.id) }}
                  className="hover:underline underline-offset-4 decoration-1"
                >
                  {battle.war.name}
                </Link>
              </p>
            )}
          </div>

          {/* Outcome Badge */}
          {battle.winner && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[rgb(var(--color-muted))]">Victor:</span>
              <span className="px-3 py-1 bg-[rgb(var(--color-success)_/_0.1)] text-[rgb(var(--color-success))] rounded-sm font-medium border border-[rgb(var(--color-success)_/_0.3)]">
                {battle.winner.name}
              </span>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="mt-4 flex items-center gap-2 text-[rgb(var(--color-muted))] text-sm">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>
            {battle.latitude.toFixed(2)}°N, {battle.longitude.toFixed(2)}°E
          </span>
          {battle.country && (
            <>
              <span>·</span>
              <span>{battle.country.name}</span>
            </>
          )}
        </div>

        {/* Tags Row */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* Participants */}
          {battle.participants.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {battle.participants.map((p) => (
                <span
                  key={p.id}
                  className="px-2.5 py-0.5 bg-[rgb(var(--color-background))] text-[rgb(var(--color-foreground))] text-xs rounded-sm border border-[rgb(var(--color-border))]"
                >
                  {p.name}
                </span>
              ))}
            </div>
          )}

          {/* Theatres */}
          {battle.theatres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {battle.theatres.map((t) => (
                <span
                  key={t.id}
                  className="px-2.5 py-0.5 bg-[rgb(var(--color-accent)/0.1)] text-[rgb(var(--color-foreground))] text-xs rounded-sm border border-[rgb(var(--color-border))]"
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}

          {/* Scale */}
          {battle.scale && (
            <span className="px-2.5 py-0.5 bg-[rgb(var(--color-accent)/0.1)] text-[rgb(var(--color-foreground))] text-xs rounded-sm border border-[rgb(var(--color-border))]">
              Scale: {battle.scale}
            </span>
          )}

          {/* Massacre Indicator */}
          {battle.massacre && (
            <span className="px-2.5 py-0.5 bg-[rgb(var(--color-destructive)/0.1)] text-[rgb(var(--color-destructive))] text-xs rounded-sm border border-[rgb(var(--color-destructive)/0.3)] font-medium">
              Massacre
            </span>
          )}
        </div>
      </div>

      {/* Bottom Accent */}
      <div className="h-0.5 bg-linear-to-r from-[rgb(var(--color-border))] via-[rgb(var(--color-accent))] to-[rgb(var(--color-border))] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
    </article>
  )
}
