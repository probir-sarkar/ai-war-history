/** Route-level pending fallback shown while a client-side loader runs. */
export function RoutePending() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto max-w-6xl px-6 py-24 text-center font-mono text-xs uppercase tracking-[0.2em] text-foreground/70"
    >
      Loading…
    </div>
  )
}
