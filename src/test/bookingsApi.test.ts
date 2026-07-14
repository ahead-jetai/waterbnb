import { describe, it, expect, vi, beforeEach } from 'vitest'

const supabaseState: { bookings: { listing_id: string; check_in: string; check_out: string; status: string }[] } = {
  bookings: [],
}

vi.mock('../utils/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'bookings') throw new Error(`unexpected table ${table}`)
      const rows = supabaseState.bookings.filter(b => b.status === 'confirmed')
      return {
        select: () => ({
          eq: (col: string, val: string) => ({
            eq: () => Promise.resolve({ data: rows.filter(r => (r as Record<string, unknown>)[col] === val), error: null }),
          }),
        }),
      }
    },
  },
}))

import { rangesOverlap, isRangeAvailable, fetchBookedDateRanges } from '../utils/bookingsApi'

describe('rangesOverlap', () => {
  it('detects overlapping ranges', () => {
    expect(rangesOverlap('2026-08-01', '2026-08-05', '2026-08-03', '2026-08-07')).toBe(true)
  })

  it('detects non-overlapping ranges', () => {
    expect(rangesOverlap('2026-08-01', '2026-08-05', '2026-08-05', '2026-08-10')).toBe(false)
  })

  it('detects adjacent-but-not-overlapping ranges as available', () => {
    expect(rangesOverlap('2026-08-01', '2026-08-05', '2026-08-06', '2026-08-10')).toBe(false)
  })
})

describe('fetchBookedDateRanges / isRangeAvailable', () => {
  beforeEach(() => {
    supabaseState.bookings = [
      { listing_id: 'l1', check_in: '2026-08-10', check_out: '2026-08-15', status: 'confirmed' },
    ]
  })

  it('returns booked ranges for a listing', async () => {
    const ranges = await fetchBookedDateRanges('l1')
    expect(ranges).toEqual([{ checkIn: '2026-08-10', checkOut: '2026-08-15' }])
  })

  it('flags an overlapping range as unavailable', async () => {
    expect(await isRangeAvailable('l1', '2026-08-12', '2026-08-18')).toBe(false)
  })

  it('flags a non-overlapping range as available', async () => {
    expect(await isRangeAvailable('l1', '2026-08-16', '2026-08-20')).toBe(true)
  })
})
