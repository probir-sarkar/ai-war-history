# War History Archive — conventions

Guidance for anyone (human or agent) changing code in this repo.

## Query style (Drizzle + oRPC)

The style below is what `src/orpc/router/wars.ts` follows. Keep new
endpoints consistent with it.

### Relational reads → Drizzle RQB

Use the Relational Query Builder (`db.query.<table>`) whenever you need
rows plus their relations. It compiles to a **single SQL statement**
(relations nested via `json_agg`) and infers nested result types — never
hand-roll joins, row schemas, or row-folding mappers for relation
fetching.

```ts
const battle = await db.query.battles.findFirst({
  where: { id: battleId }, // object-style filters
  with: {
    country: true,
    winner: true,
    loser: true,
    participants: true,
    war: true, // relations via `with`
  },
})
```

- `where` / `orderBy` use object syntax (`where: { year }`,
  `orderBy: { year: 'asc', id: 'asc' }`).
- Relations are declared once in `src/db/relations.ts` — new joins are
  added there, not per-query.

### Aggregations → core query builder

RQB has no aggregations (counts, group-bys, window functions). For those,
drop to the core builder. When an aggregation needs both page and total,
carry the total in the same statement with a window function:

```ts
sql<number>`count(*) over ()`.mapWith(Number) // filtered total, no 2nd query
```

`src/orpc/router/wars.ts` → `homePage` is the reference implementation.

### Pagination rules

- Paginated totals: either the window count above, or
  `db.$count(table, where)` run in `Promise.all` with the page fetch so
  the two statements overlap (`listAllBattles`).
- **Always** a stable `orderBy` ending in a unique column (typically
  `{ year: 'asc', id: 'asc' }`) — limit/offset pages repeat or drop rows
  without it.
- Past-the-end fallback: if the page comes back empty and `page > 1`,
  refetch page 1 (window counts vanish on empty pages).
- List pages put `page` (and any filters) in URL search params via
  `validateSearch` + `loaderDeps` + `parsePageParam` from
  `src/lib/pagination.ts`; defaults stay out of the URL.

### Procedure shape (oRPC)

One self-contained handler per procedure — query construction, clamping,
fallbacks all live inside the `.handler()` body, readable top-to-bottom.
Chain order: `.input()` → `.output()` → `.handler()`.

```ts
export const getBattle = os
  .input(z.object({ battleId: idParam }))
  .output(battleWithWarSchema.nullable().optional())
  .handler(async ({ input }) => {
    /* full logic here */
  })
```

- Contracts come from `src/orpc/schema.ts` (`idParam`, `pageInput`,
  `paginated(itemSchema)`, …). Add new shapes there; handlers reference
  them inline.
- Inputs coerce and clamp at the boundary: `z.coerce.number().int()`,
  `idParam` regex for string ids; loaders `throw notFound()` on invalid
  params before hitting the DB.
- Types derive from zod (`z.infer`) — no hand-written interfaces
  mirroring SQL rows or API shapes.
- RQB/core query results must satisfy their `.output()` schema with zero
  casts; if a cast feels necessary, the query or the schema is wrong.

### Database access

`getDb()` from `src/db/index.ts` — per-request, through Hyperdrive (it
pools server-side; don't cache pools across requests). It normalizes
`sslmode=require` → `no-verify` for local dev; TLS to the origin is
Hyperdrive's job in production.

## Tooling

- Bun, TanStack Start, Tailwind v4, zod v4.
- Before committing: `bun run typecheck && bun run lint && bun run test &&
bun run build`. Prettier via `bun run format`.
- Route files changed → run a build once; the router plugin regenerates
  the gitignored `src/routeTree.gen.ts` that typecheck depends on.
- Migrations: edit `src/db/schema.ts`, then `bun run db:generate` and
  `bun run db:migrate`. Indexes exist on `battles.year`, all FK columns,
  and `battles_to_participants.participant_id` — keep new filter/join
  columns indexed.
