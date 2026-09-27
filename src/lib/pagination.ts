export type PageToken = number | '…'

/**
 * Search schema shared by the paginated routes. Properties must be
 * optional (not `T | undefined`) so the router treats `search` as
 * optional on links, and undefined values stay out of the URL.
 */
export interface PageSearch {
  page?: number | undefined
}

/**
 * Parses the `?page=` search param for the paginated routes. Absent or
 * invalid values resolve to undefined so the router omits the param
 * instead of redirecting to `?page=1`.
 */
export function parsePageParam(
  search: Record<string, unknown>,
): number | undefined {
  const page = Number(search.page)
  return Number.isInteger(page) && page >= 1 ? page : undefined
}

/**
 * Builds the page list for a pagination control: first and last page,
 * a one-page window around the current page, and '…' for the gaps.
 */
export function pageNumbers(current: number, total: number): PageToken[] {
  const pages: PageToken[] = []
  const window = 1
  for (let i = 1; i <= total; i++) {
    if (
      i === 1 ||
      i === total ||
      (i >= current - window && i <= current + window)
    ) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }
  return pages
}

export function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(page, 1), totalPages)
}
