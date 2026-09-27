import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

/**
 * Absolute origin for canonical / og:url tags. Reads the incoming request
 * on the server and window.location in the browser.
 */
export const getOrigin = createIsomorphicFn()
  .server(() => {
    try {
      return new URL(getRequest().url).origin
    } catch {
      return ''
    }
  })
  .client(() => window.location.origin)

/** Builds an absolute URL, appending `?page=N` only when past the first page. */
export function absoluteUrl(path: string, page?: number | undefined): string {
  const url = `${getOrigin()}${path}`
  return page && page > 1 ? `${url}?page=${page}` : url
}
