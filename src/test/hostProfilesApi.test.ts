import { describe, it, expect, vi } from 'vitest'

vi.mock('../utils/supabase', () => ({ supabase: {} }))

import { computeHostRating } from '../utils/hostProfilesApi'

describe('computeHostRating', () => {
  it('returns null when no listing has reviews', () => {
    expect(computeHostRating([{ rating: 0, reviews: 0 }])).toBeNull()
    expect(computeHostRating([])).toBeNull()
  })

  it('weights the average by review count', () => {
    const result = computeHostRating([
      { rating: 5, reviews: 10 },
      { rating: 4, reviews: 30 },
    ])
    expect(result).toEqual({ rating: 4.25, reviews: 40 })
  })

  it('ignores unrated listings in the average', () => {
    const result = computeHostRating([
      { rating: 4.8, reviews: 25 },
      { rating: 0, reviews: 0 },
    ])
    expect(result).toEqual({ rating: 4.8, reviews: 25 })
  })
})
