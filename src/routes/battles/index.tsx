import { createFileRoute, Link } from '@tanstack/react-router'
import { orpc } from '#/orpc/client.ts'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatYear } from '#/lib/format.ts'

const PAGE_SIZE = 24

export const Route = createFileRoute('/battles/')({
  head: () => ({
    meta: [
      { title: 'Battles — War History Archive' },
      {
        name: 'description',
        content:
          'All battles indexed across history, linked to their parent war.',
      },
    ],
  }),
  component: BattlesPage,
})

function BattlesPage() {
  const [page, setPage] = useState(1)

  // Fetch battles data with pagination
  const battlesQuery = useQuery(
    orpc.listAllBattles.queryOptions({
      input: {
        page,
        pageSize: PAGE_SIZE,
      },
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
    setPage(newPage)
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
                    className="px-2 py-0.5 bg-background text-xs rounded-sm border border-border"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden md:block col-span-3 text-sm pt-1.5">
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
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className="border border-border px-4 py-2 hover:bg-accent/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>
          <div className="flex items-center gap-1">
            {pageNumbers(currentPage, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`e-${i}`} className="px-2 opacity-50">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`min-w-9 h-9 px-2 border ${
                    p === currentPage
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
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
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
    if (
      i === 1 ||
      i === total ||
      (i >= current - window && i <= current + window)
    ) {
      push(i)
    } else if (pages[pages.length - 1] !== '…') {
      push('…')
    }
  }
  return pages
}
