import { createFileRoute, Link } from '@tanstack/react-router'
import { orpc } from '#/orpc/client.ts'
import { useState } from 'react'
import type { SubmitEvent } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'

export const Route = createFileRoute('/')({
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
  const [page, setPage] = useState(1)
  const [filterPayload, setFilterPayload] = useState<{
    q: string
  }>({ q: '' })

  const handleFilterSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setFilterPayload({
      q: formData.get('q') as string,
    })
    setPage(1) // Reset to page 1 when filter changes
  }

  // Fetch wars data
  const warsQuery = useQuery(
    orpc.homePage.queryOptions({
      input: {
        page,
        warName: filterPayload.q,
      },
    }),
  )

  const {
    items = [],
    total,
    totalPages,
  } = warsQuery.data ?? { items: [], total: 0, totalPages: 1 }
  const safePage = Math.min(page, totalPages)

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Hero */}
      <section className="border-b border-foreground pb-12">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/70">
          The Archive · {total} entries
        </div>
        <h1 className="font-serif text-5xl md:text-7xl mt-3 leading-[0.95]">
          A record of conflict,
          <br />
          <em className="font-normal">from antiquity to now.</em>
        </h1>
        <p className="mt-6 max-w-2xl text-foreground/70">
          Browse documented wars — by name, year, combatant, and outcome. Each
          entry links to its battles.
        </p>
      </section>

      {/* Filters */}
      <section className="py-8 border-b border-border">
        <form
          onSubmit={handleFilterSubmit}
          className="grid md:grid-cols-[1fr_auto] gap-6 items-end"
        >
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70 mb-2">
              Search
            </label>
            <input
              name="q"
              placeholder="War name..."
              className="w-full bg-transparent border-b border-foreground px-0 py-2 outline-none placeholder:text-foreground/50"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 border border-foreground/30 hover:border-foreground text-foreground/70 hover:text-foreground font-mono text-xs uppercase tracking-[0.15em] transition-colors"
          >
            <Search className="w-4 h-4" />
            Filter
          </button>
        </form>
      </section>

      {/* Results meta */}
      <div className="flex items-baseline justify-between py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70">
        <span>
          {total} {total === 1 ? 'entry' : 'entries'}
        </span>
        <span>
          Page {safePage} / {totalPages}
        </span>
      </div>

      {/* List */}
      <section>
        <div className="grid grid-cols-12 gap-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70 border-b border-border">
          <div className="col-span-1">ID</div>
          <div className="col-span-8">Name</div>
          <div className="col-span-2">Battles</div>
          <div className="col-span-1 hidden md:block" />
        </div>

        {warsQuery.isLoading ? (
          <div className="py-16 text-center text-foreground/70 font-mono text-xs uppercase tracking-[0.2em]">
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-foreground/70 font-mono text-xs uppercase tracking-[0.2em]">
            No entries match.
          </div>
        ) : (
          items.map((w) => (
            <Link
              key={w.id}
              to="/wars/$warId"
              params={{ warId: String(w.id) }}
              className="grid grid-cols-12 gap-4 py-6 border-b border-border hover:bg-accent/10 transition-colors group"
            >
              <div className="col-span-1 font-mono text-xs pt-1 tabular-nums">
                {w.id}
              </div>
              <div className="col-span-11 md:col-span-8">
                <h2 className="font-serif text-2xl leading-tight group-hover:underline underline-offset-4 decoration-1">
                  {w.name}
                </h2>
              </div>
              <div className="col-span-4 md:col-span-2 text-sm pt-1.5 text-foreground/70">
                {w.battle_count} {w.battle_count === 1 ? 'battle' : 'battles'}
              </div>
              <div className="hidden md:block col-span-1 text-right">→</div>
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
                  onClick={() => setPage(p)}
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
