/** The one production origin — canonicals, og:url, sitemap always point here. */
export const SITE_URL = 'https://war-history.probir.dev'

/** Builds an absolute URL, appending `?page=N` only when past the first page. */
export function absoluteUrl(path: string, page?: number | undefined): string {
  const url = `${SITE_URL}${path}`
  return page && page > 1 ? `${url}?page=${page}` : url
}
