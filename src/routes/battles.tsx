import { createFileRoute, Link } from '@tanstack/react-router'
import { orpc } from '#/orpc/client.ts'
import { useMemo } from 'react'
import { formatYear } from '#/lib/format.ts'

const PAGE_SIZE = 24

export const Route = createFileRoute('/battles')({
  loader: async () => await orpc.listAllBattles.call({}),
  head: () => ({
    meta: [
      { title: 'Battles — War History Archive' },
      {
        name: 'description',
        content: 'All battles indexed across history, linked to their parent war.',
      },
    ],
  }),
  component: BattlesPage,
})

function BattlesPage() {
  const battles = Route.useLoaderData()
  const searchParams = Route.useSearch()
  const q = searchParams.q ?? ''
  const page = searchParams.page ?? 1

  const filtered = useMemo(() => {
    const sorted = [...battles].sort((a, b) => a.year - b.year)
    if (!q) return sorted
    const needle = q.toLowerCase()
    return sorted.filter(
      (b) =>
        b.name.toLowerCase().includes(needle) ||
        b.war?.name.toLowerCase().includes(needle) ||
        b.country?.name.toLowerCase().includes(needle),
    )
  }, [battles, q])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(Number(page), totalPages)
  const navigate = Route.useNavigate()
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const setPage = (newPage: number) => {
    navigate({
      to: '/battles',
      search: { ...searchParams, page: newPage },
    })
  }

  const setQuery = (query: string) => {
    navigate({
      to: '/battles',
      search: { ...searchParams, q: query, page: 1 },
    })
  }

  // Get year range
  const years = battles.map((b) => b.year)
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="border-b border-foreground pb-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
          Index II
        </div>
        <h1 className="font-serif text-5xl md:text-6xl mt-3">Battles</h1>
        <p className="text-muted mt-4 max-w-xl">
          {battles.length} engagements catalogued and cross-referenced to their
          parent war.
        </p>
      </header>

      <div className="py-8 border-b border-border">
        <input
          value={q}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search battles, locations, wars..."
          className="w-full max-w-md bg-transparent border-b border-foreground py-2 outline-none placeholder:text-muted"
        />
      </div>

      {/* Results meta */}
      <div className="flex items-baseline justify-between py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        <span>
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        </span>
        <span>
          {formatYear(minYear)} — {formatYear(maxYear)}
        </span>
        <span>
          Page {safePage} / {totalPages}
        </span>
      </div>

      <div className="grid grid-cols-12 gap-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted border-b border-border">
        <div className="col-span-2">Year</div>
        <div className="col-span-4">Battle</div>
        <div className="col-span-3 hidden md:block">Location</div>
        <div className="col-span-3 hidden md:block">War</div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted font-mono text-xs uppercase tracking-[0.2em]">
          No entries match.
        </div>
      ) : (
        slice.map((b) => (
          <div
            key={b.id}
            className="grid grid-cols-12 gap-4 py-5 border-b border-border hover:bg-accent/5 transition-colors"
          >
            <div className="col-span-2 font-mono text-xs tabular-nums pt-1">
              {formatYear(b.year)}
            </div>
            <div className="col-span-10 md:col-span-4">
              <Link
                to="/battles/$battleId"
                params={{ battleId: String(b.id) }}
                className="font-serif text-xl leading-snug hover:underline underline-offset-4 decoration-1"
              >
                {b.name}
              </Link>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {b.participants.map((p) => (
                  <span
                    key={p.id}
                    className="px-2 py-0.5 bg-background text-muted text-xs rounded-sm border border-border"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden md:block col-span-3 text-sm pt-1.5 text-muted">
              {b.latitude.toFixed(2)}°N, {b.longitude.toFixed(2)}°E
              {b.country && <span className="ml-1">· {b.country.name}</span>}
            </div>
            <div className="hidden md:block col-span-3 pt-1.5">
              {b.war && (
                <Link
                  to="/wars/$warId"
                  params={{ warId: String(b.war.id) }}
                  className="text-sm underline underline-offset-4 decoration-1 hover:no-underline"
                >
                  {b.war.name}
                </Link>
              )}
            </div>
          </div>
        ))
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-between pt-8 font-mono text-xs uppercase tracking-[0.18em]">
          <button
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
            className="border border-border px-4 py-2 hover:bg-accent/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>
          <div className="flex items-center gap-1">
            {pageNumbers(safePage, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`e-${i}`} className="px-2 text-muted">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`min-w-9 h-9 px-2 border ${
                    p === safePage
                      ? 'border-foreground bg-[rgb(var(--color-foreground))] text-[rgb(var(--color-background))]'
                      : 'border-border hover:bg-accent/10'
                  } transition-colors`}
                >
                  {p}
                </button>
              ),
            )}
          </div>
          <button
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
            className="border border-border px-4 py-2 hover:bg-accent/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </nav>
      )}
    </div>
  )
}

function pageNumbers(current: number, total: number): (number | '…')[] {
  const pages: (number | '…')[] = []
  const push = (n: number | '…') => pages.push(n)
  const window = 1
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - window && i <= current + window)) {
      push(i)
    } else if (pages[pages.length - 1] !== '…') {
      push('…')
    }
  }
  return pages
}
