import { describe, it, expect, vi, beforeEach } from 'vitest'

type BookingRow = { listing_id: string; check_in: string; check_out: string; status: string }
type BlockedRow = { id: string; listing_id: string; start_date: string; end_date: string; reason: string | null }

const supabaseState: { bookings: BookingRow[]; blocked: BlockedRow[] } = {
  bookings: [],
  blocked: [],
}

vi.mock('../utils/supabase', () => ({
  supabase: {
    rpc: (name: string, args: { p_listing?: string; p_start?: string; p_end?: string }) => {
      if (name !== 'marketplace_unavailable_dates') throw new Error(`unexpected RPC ${name}`)
      const rows = [
        ...supabaseState.blocked.map(r => ({ listing_id: r.listing_id, check_in: r.start_date, check_out: r.end_date, source: 'host' })),
        ...supabaseState.bookings.filter(r => r.status === 'confirmed').map(r => ({ ...r, source: 'booking' })),
      ]
      return {
        data: rows.filter(r => (!args.p_listing || r.listing_id === args.p_listing)
          && (!args.p_start || r.check_out > args.p_start) && (!args.p_end || r.check_in < args.p_end)),
        error: null,
      }
    },
  },
}))

import { rangesOverlap, isRangeAvailable, fetchBookedDateRanges, fetchUnavailableListingIds, fetchUnavailableRanges } from '../utils/bookingsApi'

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

  it('uses the public read model for search results across listings', async () => {
    supabaseState.blocked[0].listing_id = 'l2'
    expect(await fetchUnavailableListingIds('2026-08-12', '2026-09-02')).toEqual(new Set(['l1', 'l2']))
  })
})
