import { cn } from '#/lib/utils.ts'
import { pageNumbers } from '#/lib/pagination.ts'
import type { PageToken } from '#/lib/pagination.ts'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between pt-8 font-mono text-xs uppercase tracking-[0.18em]"
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="border border-border px-4 py-2 hover:bg-accent/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ← Prev
      </button>
      <div className="flex items-center gap-1">
        {pageNumbers(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-foreground/70">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                'min-w-9 h-9 px-2 border transition-colors',
                p === page
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border hover:bg-accent/10',
              )}
            >
              {p}
            </button>
          ),
        )}
      </div>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="border border-border px-4 py-2 hover:bg-accent/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Next →
      </button>
    </nav>
  )
}

export type { PageToken }
