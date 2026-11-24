import { beforeEach, expect, it, vi } from 'vitest'
import { fetchListing, fetchListings } from '../utils/listingsApi'

const { catalog } = vi.hoisted(() => ({ catalog: vi.fn() }))
vi.mock('../utils/supabase', () => ({
  listingPublicColumns: 'id,pilot_approved_at',
  supabase: { from: catalog },
}))

function query(result: unknown) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  catalog.mockReturnValue(builder)
  return builder
}

beforeEach(() => catalog.mockReset())

it('does not substitute a fictional listing for a missing direct URL', async () => {
  const builder = query({ data: null, error: null })
  await expect(fetchListing('l1')).resolves.toBeNull()
  expect(builder.not).toHaveBeenCalledWith('pilot_approved_at', 'is', null)
})

it('does not use fictional listings when the live catalog fails', async () => {
  query({ data: null, error: { message: 'Unavailable' } })
  await expect(fetchListings()).rejects.toThrow('Could not load live listings')
})
