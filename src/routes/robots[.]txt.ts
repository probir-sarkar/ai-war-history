import '#/polyfill'

import { createFileRoute } from '@tanstack/react-router'
import { SITE_URL } from '#/lib/site.ts'

async function handle() {
  const origin = SITE_URL

  const body =
    'User-agent: *\n' + 'Disallow:\n' + `\nSitemap: ${origin}/sitemap.xml\n`

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  })
}

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: handle,
      HEAD: handle,
    },
  },
})
