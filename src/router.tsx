import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { getContext } from './integrations/tanstack-query/root-provider'
import { RoutePending } from './components/pending'

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    // Prefetch a route's chunk + loader data on link hover/focus so the
    // click itself is instant.
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 30_000,
    // Give slow client-side loaders visible feedback quickly instead of a
    // frozen page.
    defaultPendingMs: 200,
    defaultPendingComponent: RoutePending,
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
