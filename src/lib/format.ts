export function formatYear(year: number): string {
  if (year < 0) {
    return `${Math.abs(year)} BC`
  }
  return `${year} AD`
}

export function formatYearRange(start: number, end: number): string {
  return `${formatYear(start)} — ${formatYear(end)}`
}

export function formatLatitude(latitude: number, precision = 2): string {
  return `${Math.abs(latitude).toFixed(precision)}°${latitude < 0 ? 'S' : 'N'}`
}

export function formatLongitude(longitude: number, precision = 2): string {
  return `${Math.abs(longitude).toFixed(precision)}°${longitude < 0 ? 'W' : 'E'}`
}

export function formatCoordinates(
  latitude: number,
  longitude: number,
  precision = 2,
): string {
  return `${formatLatitude(latitude, precision)}, ${formatLongitude(longitude, precision)}`
}
