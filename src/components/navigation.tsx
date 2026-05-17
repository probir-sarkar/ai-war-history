import { Link } from '@tanstack/react-router'

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

          {/* Navigation links */}
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors"
            >
              Wars
            </Link>
            <Link
              to="/battles"
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors"
            >
              Battles
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
