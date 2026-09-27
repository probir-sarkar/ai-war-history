import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { orpc } from '#/orpc/client.ts'
import { useQuery } from '@tanstack/react-query'
import { formatYear, formatLatitude, formatLongitude } from '#/lib/format.ts'
import { Pagination } from '#/components/pagination.tsx'
import { itemListJsonLd, jsonLdScript } from '#/lib/jsonld.ts'
import { parsePageParam } from '#/lib/pagination.ts'
import { absoluteUrl } from '#/lib/site.ts'
import type { PageSearch } from '#/lib/pagination.ts'
import {
  MapPin,
  Trophy,
  ShieldX,
  Mountain,
  Cloud,
  Waves,
  Skull,
} from 'lucide-react'

const PAGE_SIZE = 24

/* Anything outside recorded history is not a year — treat it as a 404
   (and a 200 "no battles" page for e.g. /999999 would be a soft 404). */
const MIN_YEAR = -5000
const MAX_YEAR = 2100

function parseYear(raw: string): number | null {
  if (!/^-?\d+$/.test(raw)) return null
  const year = Number(raw)
  return year >= MIN_YEAR && year <= MAX_YEAR ? year : null
}

export const Route = createFileRoute('/$year/')({
  validateSearch: (search: Record<string, unknown>): PageSearch => ({
    page: parsePageParam(search),
  }),
  loaderDeps: ({ search: { page } }) => ({ page: page ?? 1 }),
  loader: async ({ context, params, deps }) => {
    const year = parseYear(params.year)
    if (year === null) throw notFound()
    return context.queryClient.ensureQueryData(
      orpc.listAllBattles.queryOptions({
        input: {
          year,
          page: deps.page,
          pageSize: PAGE_SIZE,
        },
      }),
    )
  },
  head: ({ params, loaderData, match }) => {
    const year = parseYear(params.year)
    if (year === null) return { meta: [] }

    const meta: Record<string, string>[] = [
      { title: `${formatYear(year)} — War History Archive` },
      {
        name: 'description',
        content: loaderData
          ? `${loaderData.total} battles and conflicts from the year ${formatYear(year)}, with participants, locations, and outcomes.`
          : `Battles and conflicts from the year ${formatYear(year)}.`,
      },
      {
        property: 'og:title',
        content: `${formatYear(year)} — War History Archive`,
      },
      {
        property: 'og:url',
        content: absoluteUrl(`/${year}`, match.search.page),
      },
    ]
    // Years with no recorded battles get crawled as empty pages otherwise.
    if (loaderData && loaderData.total === 0) {
      meta.push({ name: 'robots', content: 'noindex' })
    }

    return {
      meta,
      links: [
        { rel: 'canonical', href: absoluteUrl(`/${year}`, match.search.page) },
      ],
      // Empty years are noindex — don't advertise their (missing) items.
      scripts:
        loaderData && loaderData.total > 0
          ? [
              jsonLdScript(
                itemListJsonLd(
                  loaderData.items.map((b) => ({
                    name: `Battle of ${b.name}`,
                    url: absoluteUrl(`/battles/${b.id}`),
                  })),
                ),
              ),
            ]
          : [],
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { year } = Route.useParams()
  const { page: pageParam } = Route.useSearch()
  const page = pageParam ?? 1
  const navigate = Route.useNavigate()

  const battlesQuery = useQuery(
    orpc.listAllBattles.queryOptions({
      input: {
        year: Number(year),
        page,
        pageSize: PAGE_SIZE,
      },
    }),
  )

  const {
    items: battles = [],
    total = 0,
    totalPages = 1,
  } = battlesQuery.data ?? { items: [], total: 0, totalPages: 1 }

  const handlePageChange = (newPage: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: newPage === 1 ? undefined : newPage,
      }),
    })
  }

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <header className="border-b border-accent bg-background">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-baseline gap-4">
            <h1 className="text-4xl md:text-5xl text-foreground tracking-tight font-serif">
              {formatYear(Number(year))}
            </h1>
            <span className="text-foreground/70 text-lg font-light">
              {total} {total === 1 ? 'Battle' : 'Battles'}
            </span>
          </div>
        </div>
      </header>

      {/* Battles Grid */}
      <div className="max-w-5xl mx-auto px-6 py-10">
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

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  )
}

type BattlesQueryOptions = ReturnType<typeof orpc.listAllBattles.queryOptions>
type BattlesData = Awaited<
  ReturnType<NonNullable<BattlesQueryOptions['queryFn']>>
>

function BattleCard({ battle }: { battle: BattlesData['items'][number] }) {
  const theatreIcon = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.includes('land') || lower.includes('ground'))
      return <Mountain className="w-4 h-4" />
    if (lower.includes('air') || lower.includes('aerial'))
      return <Cloud className="w-4 h-4" />
    if (
      lower.includes('sea') ||
      lower.includes('naval') ||
      lower.includes('marine')
    )
      return <Waves className="w-4 h-4" />
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
              <div className="flex items-center gap-1.5 text-success">
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
            <span>
              {formatLatitude(battle.latitude, 1)},{' '}
              {formatLongitude(battle.longitude, 1)}
            </span>
            {battle.country && <span>· {battle.country.name}</span>}
          </div>

          {/* Theatres as icons with text */}
          {battle.theatres && battle.theatres.length > 0 && (
            <div className="flex items-center gap-3 text-accent">
              {battle.theatres.map((t) => (
                <div
                  key={t}
                  className="flex items-center gap-1 text-sm font-medium"
                >
                  {theatreIcon(t)}
                  <span>{t}</span>
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
            {battle.participants.map((p) => (
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
