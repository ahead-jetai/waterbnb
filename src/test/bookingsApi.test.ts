import { describe, it, expect, vi, beforeEach } from 'vitest'

type BookingRow = { listing_id: string; check_in: string; check_out: string; status: string }
type BlockedRow = { id: string; listing_id: string; start_date: string; end_date: string; reason: string | null }

const supabaseState: { bookings: BookingRow[]; blocked: BlockedRow[] } = {
  bookings: [],
  blocked: [],
}

function queryable(rows: Record<string, unknown>[]) {
  const filtered = [...rows]
  const builder = {
    eq(col: string, val: unknown) {
      return queryable(filtered.filter(r => r[col] === val))
    },
    order() {
      return Promise.resolve({ data: filtered, error: null })
    },
    then(resolve: (v: { data: Record<string, unknown>[]; error: null }) => void) {
      resolve({ data: filtered, error: null })
    },
  }
  return builder
}

vi.mock('../utils/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'bookings') return { select: () => queryable(supabaseState.bookings) }
      if (table === 'listing_blocked_dates') return { select: () => queryable(supabaseState.blocked) }
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

import { rangesOverlap, isRangeAvailable, fetchBookedDateRanges, fetchUnavailableRanges } from '../utils/bookingsApi'

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

describe('availability with bookings and host blocks', () => {
  beforeEach(() => {
    supabaseState.bookings = [
      { listing_id: 'l1', check_in: '2026-08-10', check_out: '2026-08-15', status: 'confirmed' },
    ]
    supabaseState.blocked = [
      { id: 'b1', listing_id: 'l1', start_date: '2026-09-01', end_date: '2026-09-05', reason: 'Maintenance' },
    ]
  })

  it('returns booked ranges for a listing', async () => {
    const ranges = await fetchBookedDateRanges('l1')
    expect(ranges).toEqual([{ checkIn: '2026-08-10', checkOut: '2026-08-15' }])
  })

  it('merges bookings and host blocks into unavailable ranges, sorted by date', async () => {
    const ranges = await fetchUnavailableRanges('l1')
    expect(ranges).toEqual([
      { checkIn: '2026-08-10', checkOut: '2026-08-15', source: 'booking' },
      { checkIn: '2026-09-01', checkOut: '2026-09-05', source: 'host' },
    ])
  })

  it('flags a range overlapping a confirmed booking as unavailable', async () => {
    expect(await isRangeAvailable('l1', '2026-08-12', '2026-08-18')).toBe(false)
  })

  it('flags a range overlapping a host block as unavailable', async () => {
    expect(await isRangeAvailable('l1', '2026-09-03', '2026-09-08')).toBe(false)
  })

  it('flags a range clear of bookings and blocks as available', async () => {
    expect(await isRangeAvailable('l1', '2026-08-16', '2026-08-20')).toBe(true)
  })

  it('ignores blocks on other listings', async () => {
    expect(await isRangeAvailable('l2', '2026-09-03', '2026-09-08')).toBe(true)
  })
})
