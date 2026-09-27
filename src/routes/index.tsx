import { createFileRoute, Link } from '@tanstack/react-router'
import { orpc } from '#/orpc/client.ts'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import type { FormEvent } from 'react'

import { Pagination } from '#/components/pagination.tsx'
import { parsePageParam } from '#/lib/pagination.ts'
import type { PageSearch } from '#/lib/pagination.ts'

interface IndexSearch extends PageSearch {
  q?: string | undefined
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    page: parsePageParam(search),
    q:
      typeof search.q === 'string' && search.q.trim().length > 0
        ? search.q.trim()
        : undefined,
  }),
  loaderDeps: ({ search: { page, q } }) => ({ page: page ?? 1, q }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      orpc.homePage.queryOptions({
        input: { page: deps.page, warName: deps.q },
      }),
    )
  },
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
  const { page: pageParam, q } = Route.useSearch()
  const page = pageParam ?? 1
  const navigate = Route.useNavigate()

  const warsQuery = useQuery(
    orpc.homePage.queryOptions({
      input: { page, warName: q },
    }),
  )

  const {
    items = [],
    total = 0,
    totalPages = 1,
    currentPage = 1,
  } = warsQuery.data ?? {
    items: [],
    total: 0,
    totalPages: 1,
    currentPage: 1,
  }

  const handleFilterSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const nextQuery = String(formData.get('q') ?? '').trim()
    navigate({
      search: (prev) => ({
        ...prev,
        q: nextQuery || undefined,
        page: undefined, // Reset to page 1 when filter changes
      }),
    })
  }

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
            <label
              htmlFor="war-search"
              className="block font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70 mb-2"
            >
              Search
            </label>
            <input
              id="war-search"
              name="q"
              key={q ?? ''}
              defaultValue={q ?? ''}
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
          Page {currentPage} / {totalPages}
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

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  )
}
