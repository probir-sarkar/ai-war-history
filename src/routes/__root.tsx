import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'

import { Navigation } from '../components/navigation'
import { absoluteUrl } from '../lib/site'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'War History Archive',
      },
      {
        name: 'description',
        content: 'A chronological record of armed conflict throughout history.',
      },
      { property: 'og:site_name', content: 'War History Archive' },
      { property: 'og:image', content: absoluteUrl('/og-image.jpg') },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: absoluteUrl('/og-image.jpg') },
      {
        name: 'theme-color',
        content: '#f9f5ec',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/70">
        404
      </div>
      <h1 className="font-serif text-4xl mt-3">Page not found</h1>
      <p className="mt-4 text-foreground/70">
        The record you are looking for is not in the archive.
      </p>
      <div className="mt-8 flex items-center justify-center gap-6 font-mono text-xs uppercase tracking-[0.2em]">
        <Link to="/" className="underline underline-offset-4 decoration-1">
          Wars index
        </Link>
        <Link
          to="/battles"
          className="underline underline-offset-4 decoration-1"
        >
          Battles index
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-destructive">
        Error
      </div>
      <h1 className="font-serif text-4xl mt-3">Something went wrong</h1>
      <p className="mt-4 text-sm text-foreground/70 font-mono">
        {error.message}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-8 px-4 py-2 border border-foreground/30 hover:border-foreground font-mono text-xs uppercase tracking-[0.15em] transition-colors"
      >
        Reload
      </button>
    </div>
  ),
})

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:border focus:border-border font-mono text-xs uppercase tracking-[0.15em]"
        >
          Skip to content
        </a>
        <Navigation />
        <main id="main-content">
          <Outlet />
        </main>
        <Scripts />
      </body>
    </html>
  )
}
