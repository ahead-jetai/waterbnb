import { supabase } from './supabase'

export type BlockedRange = {
  id: string
  listingId: string
  startDate: string // ISO date, first blocked night
  endDate: string // ISO date, checkout-style exclusive end
  reason?: string
}

type BlockedRangeRow = {
  id: string
  listing_id: string
  start_date: string
  end_date: string
  reason: string | null
}

function rowToBlockedRange(row: BlockedRangeRow): BlockedRange {
  return {
    id: row.id,
    listingId: row.listing_id,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason ?? undefined,
  }
}

/** Host-blocked date ranges for a listing, soonest first. */
export async function fetchBlockedRanges(listingId: string): Promise<BlockedRange[]> {
  const { data, error } = await supabase
    .from('listing_blocked_dates')
    .select('*')
    .eq('listing_id', listingId)
    .order('start_date', { ascending: true })
  if (error) {
    console.error('Failed to fetch blocked dates:', error.message)
    return []
  }
  return (data as BlockedRangeRow[]).map(rowToBlockedRange)
}

export async function addBlockedRange(
  listingId: string,
  startDate: string,
  endDate: string,
  reason?: string
): Promise<BlockedRange> {
  const { data, error } = await supabase
    .from('listing_blocked_dates')
    .insert({ listing_id: listingId, start_date: startDate, end_date: endDate, reason: reason || null })
    .select()
    .single()
  if (error) throw new Error(`Could not block those dates: ${error.message}`)
  return rowToBlockedRange(data as BlockedRangeRow)
}

export async function removeBlockedRange(id: string): Promise<void> {
  const { error } = await supabase.from('listing_blocked_dates').delete().eq('id', id)
  if (error) throw new Error(`Could not unblock those dates: ${error.message}`)
}

/** Ids of listings with a host block overlapping the given date range — used to exclude them from search results. */
export async function fetchHostBlockedListingIds(checkIn: string, checkOut: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('listing_blocked_dates')
    .select('listing_id')
    .lt('start_date', checkOut)
    .gt('end_date', checkIn)
  if (error) {
    console.error('Failed to fetch host-blocked listings:', error.message)
    return new Set()
  }
  return new Set((data as Pick<BlockedRangeRow, 'listing_id'>[]).map(r => r.listing_id))
}
