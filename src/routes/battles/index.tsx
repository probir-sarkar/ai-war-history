import { createFileRoute, Link } from '@tanstack/react-router'
import { orpc } from '#/orpc/client.ts'
import { useQuery } from '@tanstack/react-query'
import { formatYear, formatLatitude, formatLongitude } from '#/lib/format.ts'
import { Pagination } from '#/components/pagination.tsx'
import { itemListJsonLd, jsonLdScript } from '#/lib/jsonld.ts'
import { parsePageParam } from '#/lib/pagination.ts'
import { absoluteUrl } from '#/lib/site.ts'
import type { PageSearch } from '#/lib/pagination.ts'

const PAGE_SIZE = 24

export const Route = createFileRoute('/battles/')({
  validateSearch: (search: Record<string, unknown>): PageSearch => ({
    page: parsePageParam(search),
  }),
  loaderDeps: ({ search: { page } }) => ({ page: page ?? 1 }),
  loader: async ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      orpc.listAllBattles.queryOptions({
        input: { page: deps.page, pageSize: PAGE_SIZE },
      }),
    ),
  head: ({ loaderData, match }) => ({
    meta: [
      {
        title:
          match.search.page && match.search.page > 1
            ? `Battles (page ${match.search.page}) — War History Archive`
            : 'Battles — War History Archive',
      },
      {
        name: 'description',
        content: loaderData
          ? `All ${loaderData.total} battles indexed across history, each linked to its parent war.`
          : 'All battles indexed across history, linked to their parent war.',
      },
      { property: 'og:title', content: 'Battles — War History Archive' },
      {
        property: 'og:url',
        content: absoluteUrl('/battles', match.search.page),
      },
    ],
    links: [
      { rel: 'canonical', href: absoluteUrl('/battles', match.search.page) },
    ],
    scripts: loaderData
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
  }),
  component: BattlesPage,
})

function BattlesPage() {
  const { page: pageParam } = Route.useSearch()
  const page = pageParam ?? 1
  const navigate = Route.useNavigate()

  const battlesQuery = useQuery(
    orpc.listAllBattles.queryOptions({
      input: { page, pageSize: PAGE_SIZE },
    }),
  )

  const {
    items = [],
    total = 0,
    totalPages = 1,
    currentPage = 1,
  } = battlesQuery.data ?? {
    items: [],
    total: 0,
    totalPages: 1,
    currentPage: 1,
  }

  // Get year range from current page items
  const years = items.map((b) => b.year)
  const minYear = years.length > 0 ? Math.min(...years) : 0
  const maxYear = years.length > 0 ? Math.max(...years) : 0

  const handlePageChange = (newPage: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: newPage === 1 ? undefined : newPage,
      }),
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="border-b border-foreground pb-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em]">
          Index II
        </div>
        <h1 className="font-serif text-5xl md:text-6xl mt-3">Battles</h1>
        <p className="mt-4 max-w-xl">
          {total} engagements catalogued and cross-referenced to their parent
          war.
        </p>
      </header>

      {/* Results meta */}
      <div className="flex items-baseline justify-between py-4 font-mono text-[10px] uppercase tracking-[0.2em]">
        <span>
          {total} {total === 1 ? 'entry' : 'entries'}
        </span>
        <span>
          {formatYear(minYear)} — {formatYear(maxYear)}
        </span>
        <span>
          Page {currentPage} / {totalPages}
        </span>
      </div>

      <div className="grid grid-cols-12 gap-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] border-b border-border">
        <div className="col-span-2">Year</div>
        <div className="col-span-4">Battle</div>
        <div className="col-span-3 hidden md:block">Location</div>
        <div className="col-span-3 hidden md:block">War</div>
      </div>

      {battlesQuery.isLoading ? (
        <div className="py-16 text-center font-mono text-xs uppercase tracking-[0.2em]">
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center font-mono text-xs uppercase tracking-[0.2em]">
          No entries match.
        </div>
      ) : (
        items.map((b) => (
          <Link
            key={b.id}
            to="/battles/$battleId"
            params={{ battleId: String(b.id) }}
            className="grid grid-cols-12 gap-4 py-5 border-b border-border hover:bg-accent/5 transition-colors group"
          >
            <div className="col-span-2 font-mono text-xs tabular-nums pt-1">
              {formatYear(b.year)}
            </div>
            <div className="col-span-10 md:col-span-4">
              <span className="font-serif text-xl leading-snug group-hover:underline underline-offset-4 decoration-1">
                {b.name}
              </span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {b.participants.map((p) => (
                  <span
                    key={p.id}
                    className="px-2 py-0.5 bg-background text-xs rounded-sm border border-border"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden md:block col-span-3 text-sm pt-1.5">
              {formatLatitude(b.latitude)}, {formatLongitude(b.longitude)}
              {b.country && <span className="ml-1">· {b.country.name}</span>}
            </div>
            <div className="hidden md:block col-span-3 pt-1.5">
              {b.war && (
                <Link
                  to="/wars/$warId"
                  params={{ warId: String(b.war.id) }}
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm underline underline-offset-4 decoration-1 hover:no-underline"
                >
                  {b.war.name}
                </Link>
              )}
            </div>
          </Link>
        ))
      )}

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  )
}
