export function formatYear(year: number): string {
  if (year < 0) {
    return `${Math.abs(year)} BC`
  }
  return `${year} AD`
}

export function formatYearRange(start: number, end: number): string {
  return `${formatYear(start)} — ${formatYear(end)}`
}
