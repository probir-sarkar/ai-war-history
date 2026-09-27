import { QueryClient } from '@tanstack/react-query'

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // The archive is immutable historical data — a fetched page never
        // changes, so revisits reuse the cache instead of refetching.
        staleTime: Infinity,
      },
    },
  })

  return {
    queryClient,
  }
}
export default function TanstackQueryProvider() {}
