import { describe, expect, it } from 'vitest'
import {
  formatLatitude,
  formatLongitude,
  formatYear,
  formatYearRange,
} from './format.ts'

describe('formatYear', () => {
  it('formats AD years', () => {
    expect(formatYear(1943)).toBe('1943 AD')
  })

  it('formats BC years', () => {
    expect(formatYear(-490)).toBe('490 BC')
  })

  it('treats year 0 as AD', () => {
    expect(formatYear(0)).toBe('0 AD')
  })
})

describe('formatYearRange', () => {
  it('formats a BC-to-AD span', () => {
    expect(formatYearRange(-431, -404)).toBe('431 BC — 404 BC')
  })
})

describe('formatLatitude', () => {
  it('labels north latitudes', () => {
    expect(formatLatitude(51.5072)).toBe('51.51°N')
  })

  it('labels south latitudes as positive degrees S', () => {
    expect(formatLatitude(-33.8688)).toBe('33.87°S')
  })

  it('honours precision', () => {
    expect(formatLatitude(51.5072, 4)).toBe('51.5072°N')
  })
})

describe('formatLongitude', () => {
  it('labels east longitudes', () => {
    expect(formatLongitude(2.3522)).toBe('2.35°E')
  })

  it('labels west longitudes as positive degrees W', () => {
    expect(formatLongitude(-118.2437)).toBe('118.24°W')
  })

  it('honours precision', () => {
    expect(formatLongitude(-118.2437, 1)).toBe('118.2°W')
  })
})
