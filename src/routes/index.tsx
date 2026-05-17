import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { orpc } from '#/orpc/client.ts'
import { useMemo } from 'react'
import { formatYear, formatYearRange } from '#/lib/format.ts'

const PAGE_SIZE = 12

export const Route = createFileRoute('/')({
  loader: async () => await orpc.listWars.call({}),
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string | undefined) ?? '',
    page: (search.page as number | undefined) ?? 1,
    year: (typeof search.year === 'number' ? search.year : undefined),
  }),
  head: () => ({
    meta: [
      { title: 'Wars — War History Archive' },
      {
        name: 'description',
        content: 'A chronological record of armed conflict throughout history.',
      },
    ],
  }),
  component: Index,
})

function Index() {
  const wars = Route.useLoaderData()
  const navigate = useNavigate({ from: '/' })

  // Get URL search params
  const searchParams = Route.useSearch()
  const q = searchParams.q ?? ''
  const page = searchParams.page ?? 1
  const year = searchParams.year ? Number(searchParams.year) : null

  // Filter and sort wars
  const filtered = useMemo(() => {
    let list = wars
      .map((w) => ({
        ...w,
        battles: w.battles?.filter((b) => {
          if (year === null) return true
          return b.year === year
        }) ?? [],
      }))
      .filter((w) => {
        // Filter by name search
        if (q && !w.name.toLowerCase().includes(q.toLowerCase())) return false
        // Only show wars that have battles in the selected year (if year is selected)
        if (year !== null && w.battles.length === 0) return false
        return true
      })
    return list.sort((a, b) => a.id - b.id)
  }, [wars, q, year])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(Number(page), totalPages)
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const setPage = (newPage: number) => {
    navigate({
      search: { ...searchParams, page: newPage },
    })
  }

  const setQuery = (query: string) => {
    navigate({
      search: { ...searchParams, q: query, page: 1 },
    })
  }

  const setYear = (selectedYear: number | null) => {
    navigate({
      search: { ...searchParams, year: selectedYear, page: 1 },
    })
  }

  // Get year range from wars
  const years = wars.flatMap((w) => {
    const battlesWithYear = w.battles?.map((b) => b.year) ?? []
    return battlesWithYear.length > 0 ? battlesWithYear : [1500] // fallback
  })
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const yearSpan = maxYear - minYear

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Hero */}
      <section className="border-b border-foreground pb-12">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/70">
          The Archive · {wars.length} entries · {yearSpan.toLocaleString()} years
        </div>
        <h1 className="font-serif text-5xl md:text-7xl mt-3 leading-[0.95]">
          A record of conflict,
          <br />
          <em className="font-normal">from antiquity to now.</em>
        </h1>
        <p className="mt-6 max-w-2xl text-foreground/70">
          {year !== null ? (
            <>
              Showing battles from <span className="text-foreground">{formatYear(year)}</span>
              {' '} · <button onClick={() => setYear(null)} className="underline decoration-dotted underline-offset-4 hover:text-foreground">Show all years</button>
            </>
          ) : (
            <>Browse documented wars from {formatYear(minYear)} to {formatYear(maxYear)} — by year, combatant, and outcome. Each entry links to its battles.</>
          )}
        </p>
      </section>

      {/* Filters */}
      <section className="py-8 border-b border-border">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70 mb-2">
              Search
            </label>
            <input
              value={q}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="War, country, location..."
              className="w-full bg-transparent border-b border-foreground px-0 py-2 outline-none placeholder:text-foreground/70"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70 mb-2">
              Battle Year
            </label>
            <div className="flex items-center gap-4">
              <select
                value={year ?? ''}
                onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
                className="bg-transparent border-b border-foreground px-0 py-2 outline-none cursor-pointer min-w-32"
              >
                <option value="">All years</option>
                {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i)
                  .reverse()
                  .map((y) => (
                    <option key={y} value={y}>
                      {formatYear(y)}
                    </option>
                  ))}
              </select>
              {year !== null && (
                <button
                  onClick={() => setYear(null)}
                  className="font-mono text-xs text-foreground/70 hover:text-foreground underline decoration-dotted underline-offset-4 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Results meta */}
      <div className="flex items-baseline justify-between py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70">
        <span>
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          {year !== null && <span> in {formatYear(year)}</span>}
        </span>
        <span>
          Page {safePage} / {totalPages}
        </span>
      </div>

      {/* List */}
      <section>
        <div className="grid grid-cols-12 gap-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70 border-b border-border">
          <div className="col-span-2">Wars</div>
          <div className="col-span-5">Name</div>
          <div className="col-span-5 hidden md:block">Battles</div>
        </div>

        {slice.length === 0 ? (
          <div className="py-16 text-center text-foreground/70 font-mono text-xs uppercase tracking-[0.2em]">
            No entries match.
          </div>
        ) : (
          slice.map((w) => (
            <Link
              key={w.id}
              to="/wars/$warId"
              params={{ warId: String(w.id) }}
              className="grid grid-cols-12 gap-4 py-6 border-b border-border hover:bg-accent/10 transition-colors group"
            >
              <div className="col-span-2 font-mono text-xs pt-1 tabular-nums">
                {w.id}
              </div>
              <div className="col-span-10 md:col-span-5">
                <h2 className="font-serif text-2xl leading-tight group-hover:underline underline-offset-4 decoration-1">
                  {w.name}
                </h2>
              </div>
              <div className="hidden md:block col-span-5 text-sm pt-1.5 text-foreground/70">
                {w.battles.length} {w.battles.length === 1 ? 'battle' : 'battles'}
                {year !== null && (
                  <span className="ml-2 text-accent">
                    in {formatYear(year)}
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </section>

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
                <span key={`e-${i}`} className="px-2 text-foreground/70">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`min-w-9 h-9 px-2 border ${
                    p === safePage
                      ? 'border-foreground bg-foreground text-background'
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
