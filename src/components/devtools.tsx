import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

/**
 * Devtools only render in development. Lives in its own module because the
 * router code-splitter can't parse a JSX-in-array prop under a conditional
 * inside a route file.
 */
export function AppDevtools() {
  if (process.env.NODE_ENV !== 'development') return null

  return (
    <TanStackDevtools
      config={{
        position: 'bottom-right',
      }}
      plugins={[
        {
          name: 'Tanstack Router',
          render: <TanStackRouterDevtoolsPanel />,
        },
        TanStackQueryDevtools,
      ]}
    />
  )
}
