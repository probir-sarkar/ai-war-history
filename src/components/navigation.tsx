import { Link } from '@tanstack/react-router'

const navLinkClass =
  'font-mono text-xs uppercase tracking-[0.15em] text-foreground/80 hover:text-foreground transition-colors'

export function Navigation() {
  return (
    <nav className="border-b border-border bg-background/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Home link */}
          <Link
            to="/"
            className="font-serif text-xl text-foreground hover:text-accent transition-colors"
          >
            War History Archive
          </Link>

          <div className="flex items-center gap-6">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              className={navLinkClass}
              activeProps={{
                className:
                  'text-foreground underline underline-offset-8 decoration-1',
              }}
            >
              Wars
            </Link>
            <Link
              to="/battles"
              className={navLinkClass}
              activeProps={{
                className:
                  'text-foreground underline underline-offset-8 decoration-1',
              }}
            >
              Battles
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
