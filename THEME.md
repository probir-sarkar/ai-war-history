# War History Archive — Theme Guide

A minimal historical archive design system for documenting conflict throughout history.

## Design Philosophy

The design draws inspiration from archival documents, history books, and museum exhibits. The aesthetic is intentionally restrained—warm tones, serif typography, and generous whitespace create a sense of solemnity appropriate for the subject matter.

**Core principles:**
- **Restraint** — Every element serves a purpose; decoration is minimal
- **Legibility** — Information must be easily scannable and readable
- **Solemnity** — The tone is respectful and academic, not sensationalist
- **Timelessness** — Design that feels rooted in tradition, not trends

---

## Color Palette

### Semantic Colors

```css
--color-background: 252 250 245;   /* Warm cream/off-white */
--color-foreground: 20 15 10;      /* Nearly black */
--color-muted: 120 110 100;        /* Warm gray */
--color-border: 180 170 160;       /* Medium warm gray */
--color-accent: 217 119 6;         /* Amber/orange for highlights */
--color-destructive: 185 28 28;    /* Red for massacres */
--color-success: 34 197 94;        /* Green for victors */
```

### Usage Guidelines

| Color | Usage |
|-------|-------|
| `background` | Page background, card backgrounds |
| `foreground` | Headings, body text, primary borders |
| `muted` | Secondary text, labels, metadata |
| `border` | Dividers, card borders, input borders |
| `accent` | Links (hover), badges, active states |
| `destructive` | Massacre indicators, warnings |
| `success` | Victor badges, positive outcomes |

### Tailwind Usage

```tsx
// With opacity
className="bg-[rgb(var(--color-accent)_/_0.1)]"

// Solid
className="text-[rgb(var(--color-muted))]"

// Borders
className="border-[rgb(var(--color-border))]"
```

---

## Typography

### Font Families

```css
--font-serif: 'Iowan Old Style', 'Apple Garamond', Baskerville, 'Times New Roman', serif;
--font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Typographic Scale

| Element | Size | Weight | Font | Letter-spacing |
|---------|------|--------|------|----------------|
| Page Title (H1) | 5xl - 7xl | Normal | Serif | Default |
| Section Title (H2) | 2xl - 4xl | Normal | Serif | Default |
| Card Title | xl - 2xl | Normal/Medium | Serif | Default |
| Body Text | base/sm | Normal | Sans | Default |
| Labels/Meta | 10px - xs | Normal | Mono | 0.2em - 0.25em (uppercase) |

### Patterns

```tsx
// Page header with label
<header>
  <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[rgb(var(--color-muted))]">
    The Archive · {count} entries
  </div>
  <h1 className="font-serif text-5xl md:text-6xl mt-3 leading-tight">
    Page Title
  </h1>
</header>

// Stat/label pair
<div>
  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--color-muted))]">
    Label
  </div>
  <div className="font-serif text-lg mt-1">
    Value
  </div>
</div>
```

---

## Spacing & Layout

### Container Widths

| Context | Max-width |
|---------|-----------|
| Full page | 6xl (72rem) |
| Article/Detail | 4xl (56rem) |
| Year page | 5xl (64rem) |

### Standard Padding

```tsx
// Page wrapper
className="mx-auto max-w-6xl px-6 py-12"

// Section spacing
className="py-10 border-b border-[rgb(var(--color-border))]"
```

### Grid System

The site uses a 12-column grid for consistent layouts:

```tsx
// Header row for tables/lists
<div className="grid grid-cols-12 gap-4">
  <div className="col-span-2">Year</div>
  <div className="col-span-4">Name</div>
  <div className="col-span-3 hidden md:block">Location</div>
  <div className="col-span-3 hidden md:block">War</div>
</div>

// Data row
<div className="grid grid-cols-12 gap-4 py-5 border-b">
  <div className="col-span-2 font-mono tabular-nums">{year}</div>
  <div className="col-span-10 md:col-span-4">{name}</div>
  <div className="hidden md:block col-span-3">{location}</div>
  <div className="hidden md:block col-span-3">{war}</div>
</div>
```

---

## Components

### Buttons

```tsx
// Primary action (rarely used)
<button className="border border-[rgb(var(--color-foreground))] px-4 py-2 hover:bg-[rgb(var(--color-accent)_/_0.1)]">
  Button
</button>

// Disabled state
<button disabled className="border border-[rgb(var(--color-border))] px-4 py-2 opacity-30 cursor-not-allowed">
  Disabled
</button>
```

### Pagination

```tsx
<nav className="flex items-center justify-between pt-8 font-mono text-xs uppercase tracking-[0.18em]">
  <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
    ← Prev
  </button>
  <div className="flex items-center gap-1">
    {pages.map((p) => (
      <button
        className={`min-w-9 h-9 px-2 border ${
          p === currentPage
            ? 'border-[rgb(var(--color-foreground))] bg-[rgb(var(--color-foreground))] text-[rgb(var(--color-background))]'
            : 'border-[rgb(var(--color-border))]'
        }`}
      >
        {p}
      </button>
    ))}
  </div>
  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
    Next →
  </button>
</nav>
```

### Cards

```tsx
<article className="group bg-[rgb(var(--color-background)_/_0.5)] rounded-sm border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-foreground)_/_0.3)] transition-all">
  <div className="p-6">
    {/* Content */}
  </div>
  <div className="h-0.5 bg-linear-to-r from-[rgb(var(--color-border))] via-[rgb(var(--color-accent))] to-[rgb(var(--color-border))]" />
</article>
```

### Badges

```tsx
// Default badge
<span className="px-2 py-0.5 bg-[rgb(var(--color-background))] text-[rgb(var(--color-foreground))] text-xs rounded-sm border border-[rgb(var(--color-border))]">
  Tag
</span>

// Accent badge
<span className="px-2 py-0.5 bg-[rgb(var(--color-accent)_/_0.1)] text-xs rounded-sm border border-[rgb(var(--color-border))]">
  Theatre
</span>

// Victor badge
<span className="px-3 py-1 bg-[rgb(var(--color-success)_/_0.1)] text-[rgb(var(--color-success))] rounded-sm border border-[rgb(var(--color-success)_/_0.3)]">
  Victor Name
</span>

// Massacre badge
<span className="px-2 py-0.5 bg-[rgb(var(--color-destructive)_/_0.1)] text-[rgb(var(--color-destructive))] text-xs rounded-sm border border-[rgb(var(--color-destructive)_/_0.3)] font-mono uppercase tracking-[0.1em]">
  Massacre
</span>
```

### Links

```tsx
// Navigation link (back button)
<Link to="/" className="font-mono text-[10px] uppercase tracking-[0.25em] text-[rgb(var(--color-muted))] hover:underline">
  ← Index
</Link>

// Content link
<Link to="/wars/$warId" params={{ warId }} className="hover:underline underline-offset-4 decoration-1">
  War Name
</Link>

// Inline reference link
<Link className="text-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))]">
  Reference
</Link>
```

### Inputs

```tsx
// Text input
<input
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  placeholder="Search..."
  className="w-full max-w-md bg-transparent border-b border-[rgb(var(--color-foreground))] py-2 outline-none placeholder:text-[rgb(var(--color-muted))]"
/>

// Select
<select
  value={sort}
  onChange={(e) => setSort(e.target.value)}
  className="w-full bg-transparent border-b border-[rgb(var(--color-foreground))] py-2 outline-none"
>
  <option value="chrono">Oldest first</option>
  <option value="reverse">Most recent first</option>
</select>
```

---

## Page Templates

### Index/List Page

```tsx
export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Page Title — War History Archive' },
      { name: 'description', content: 'Description' },
    ],
  }),
  component: IndexPage,
})

function IndexPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Hero */}
      <section className="border-b border-[rgb(var(--color-foreground))] pb-12">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[rgb(var(--color-muted))]">
          Meta info
        </div>
        <h1 className="font-serif text-5xl md:text-7xl mt-3 leading-[0.95]">
          Page Title
        </h1>
        <p className="mt-6 max-w-2xl text-[rgb(var(--color-muted))]">
          Description text...
        </p>
      </section>

      {/* Filters */}
      <section className="py-8 border-b border-[rgb(var(--color-border))]">
        {/* Filter controls */}
      </section>

      {/* List */}
      <section>
        {/* Grid/list items */}
      </section>

      {/* Pagination */}
    </div>
  )
}
```

### Detail Page

```tsx
function DetailPage() {
  const item = Route.useLoaderData()

  return (
    <article className="mx-auto max-w-4xl px-6 py-12">
      {/* Back link */}
      <Link to="/" className="font-mono text-[10px] uppercase tracking-[0.25em] text-[rgb(var(--color-muted))] hover:underline">
        ← Back
      </Link>

      {/* Header */}
      <header className="mt-6 border-b border-[rgb(var(--color-foreground))] pb-10">
        <div className="font-mono text-xs text-[rgb(var(--color-muted))]">
          Meta information
        </div>
        <h1 className="font-serif text-5xl md:text-6xl mt-4 leading-[1]">
          {item.name}
        </h1>
      </header>

      {/* Stats */}
      <section className="grid md:grid-cols-4 gap-8 py-10 border-b border-[rgb(var(--color-border))]">
        <Stat label="Label" value="Value" />
      </section>

      {/* Content sections */}
    </article>
  )
}
```

---

## Responsive Patterns

### Hide on Mobile

```tsx
<div className="hidden md:block">
  Only visible on tablet and up
</div>
```

### Responsive Typography

```tsx
<h1 className="font-serif text-5xl md:text-7xl">
  Scales from 5xl to 7xl at md breakpoint
</h1>
```

### Responsive Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
  {/* 1 column on mobile, 2 on tablet, 4 on desktop */}
</div>
```

---

## Icon Guidelines

Icons should be minimal and subtle. Use SVG icons at small sizes:

```tsx
<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="..." />
</svg>
```

Default icon color: `text-[rgb(var(--color-muted))]`

---

## State & Interactions

### Hover States

- Links: `underline underline-offset-4 decoration-1`
- Cards: `hover:bg-[rgb(var(--color-accent)_/_0.05)]`
- Buttons: `hover:bg-[rgb(var(--color-accent)_/_0.1)]`

### Transitions

```css
/* Applied globally */
a, button, input, select {
  transition: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
}
```

---

## Accessibility

- All interactive elements have focus states (use browser default or custom)
- Semantic HTML: `<article>`, `<section>`, `<header>`, `<nav>`
- Color contrast meets WCAG AA standards
- Labels for all form inputs
- Meaningful link text (avoid "click here")
