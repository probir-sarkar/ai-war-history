import { SITE_URL, absoluteUrl } from '#/lib/site.ts'

/**
 * Shared node id for the site-wide WebSite graph. Other JSON-LD blocks on a
 * page reference it (`isPartOf`) instead of restating the site description;
 * crawlers merge all JSON-LD blocks on a page by `@id`.
 */
export const WEBSITE_ID = `${SITE_URL}/#website`

export interface JsonLdNode {
  '@context'?: 'https://schema.org'
  [key: string]: unknown
}

export interface JsonLdScript {
  type: 'application/ld+json'
  children: string
}

/** JSON.stringify with `<` escaped so DB-sourced names can't close the script tag. */
export function jsonLdScript(node: JsonLdNode): JsonLdScript {
  return {
    type: 'application/ld+json',
    children: JSON.stringify(node).replaceAll('<', '\\u003c'),
  }
}

/** Site identity + search action — emitted once from the root route. */
export function websiteJsonLd(): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@id': WEBSITE_ID,
    '@type': 'WebSite',
    name: 'War History Archive',
    url: absoluteUrl('/'),
    description: 'A chronological record of armed conflict throughout history.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/** Breadcrumb trail, `items` ordered root-first. */
export function breadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/** The entities an index page lists, in display order. */
export function itemListJsonLd(
  items: Array<{ name: string; url: string }>,
): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  }
}
