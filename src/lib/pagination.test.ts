import { describe, expect, it } from 'vitest'
import { clampPage, pageNumbers } from './pagination.ts'

describe('pageNumbers', () => {
  it('returns a single page', () => {
    expect(pageNumbers(1, 1)).toEqual([1])
  })

  it('lists all pages when the window covers everything', () => {
    expect(pageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('collapses the far tail for early pages', () => {
    expect(pageNumbers(2, 5)).toEqual([1, 2, 3, '…', 5])
  })

  it('collapses both tails into ellipses for middle pages', () => {
    expect(pageNumbers(5, 10)).toEqual([1, '…', 4, 5, 6, '…', 10])
  })

  it('keeps the head explicit near the start', () => {
    expect(pageNumbers(2, 7)).toEqual([1, 2, 3, '…', 7])
  })

  it('keeps the tail explicit near the end', () => {
    expect(pageNumbers(6, 7)).toEqual([1, '…', 5, 6, 7])
  })

  it('never emits consecutive ellipses', () => {
    const pages = pageNumbers(10, 40)
    for (let i = 1; i < pages.length; i++) {
      if (pages[i] === '…') {
        expect(pages[i - 1]).not.toBe('…')
      }
    }
  })
})

describe('clampPage', () => {
  it('clamps below the range', () => {
    expect(clampPage(0, 5)).toBe(1)
  })

  it('clamps above the range', () => {
    expect(clampPage(9, 5)).toBe(5)
  })

  it('leaves in-range pages alone', () => {
    expect(clampPage(3, 5)).toBe(3)
  })
})
