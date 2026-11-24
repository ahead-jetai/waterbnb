import { authenticatedDb, listingPublicColumns, supabase, type TokenGetter } from './supabase'
import { fetchUnavailableListingIds } from './bookingsApi'
import type { Listing } from '../bookingTypes'

export type ListingFilters = {
  location?: string
  minPrice?: number
  maxPrice?: number
  boatType?: string
  checkIn?: string
  checkOut?: string
  // Client-side sort option for the listing grid on the home page (Newest, Price, Rating)
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'rating'
}

export type ListingInput = {
  title: string
  location: string
  boatType: string
  capacity: number
  amenities: string[]
  images: string[]
  description: string
  pricePerNight: number
  hostId?: string
  autoApproveBookings?: boolean
}

type ListingRow = {
  id: string
  title: string
  location: string
  boat_type: string
  capacity: number
  amenities: string[]
  images: string[]
  description: string
  price_per_night: number
  rating: number | null
  reviews: number | null
  image: string | null
  host_id: string | null
  auto_approve_bookings?: boolean | null
  pilot_approved_at?: string | null
  created_at: string
}

function rowToListing(row: ListingRow): Listing {
  return {
    id: row.id,
    title: row.title,
    location: row.location,
    pricePerNight: Number(row.price_per_night),
    rating: Number(row.rating ?? 0),
    reviews: row.reviews ?? 0,
    image: row.images[0] ?? row.image ?? '',
    images: row.images.length ? row.images : row.image ? [row.image] : [],
    tags: row.amenities,
    description: row.description,
    capacity: row.capacity,
    boatType: row.boat_type,
    hostId: row.host_id ?? undefined,
    autoApproveBookings: row.auto_approve_bookings ?? true,
    pilotApproved: Boolean(row.pilot_approved_at),
  }
}

function inputToRow(input: ListingInput) {
  return {
    title: input.title,
    location: input.location,
    boat_type: input.boatType,
    capacity: input.capacity,
    amenities: input.amenities,
    images: input.images,
    description: input.description,
    price_per_night: input.pricePerNight,
    // keep legacy columns in sync
    image: input.images[0] ?? '',
    tags: input.amenities,
  }
}

/** Approved live listings, newest first; database access rules also enforce publication. */
export async function fetchListings(filters?: ListingFilters): Promise<Listing[]> {
  let query = supabase.from('listings').select(listingPublicColumns).not('pilot_approved_at', 'is', null)
    .order('created_at', { ascending: false })
  if (filters?.location) query = query.ilike('location', `%${filters.location}%`)
  if (filters?.boatType) query = query.eq('boat_type', filters.boatType)
  if (filters?.minPrice != null) query = query.gte('price_per_night', filters.minPrice)
  if (filters?.maxPrice != null) query = query.lte('price_per_night', filters.maxPrice)

  const { data, error } = await query
  if (error) throw new Error('Could not load live listings.')
  let result = (data ?? []).map(rowToListing)

  if (filters?.checkIn && filters?.checkOut) {
    const unavailable = await fetchUnavailableListingIds(filters.checkIn, filters.checkOut)
    result = result.filter(l => !unavailable.has(l.id))
  }

  return result
}

/** Pass a Clerk session only for host management or an existing trip. */
export async function fetchListing(id: string, getToken?: TokenGetter): Promise<Listing | null> {
  const db = getToken ? authenticatedDb(getToken) : supabase
  let query = db.from('listings').select(listingPublicColumns).eq('id', id)
  if (!getToken) query = query.not('pilot_approved_at', 'is', null)
  const { data, error } = await query.maybeSingle()
  if (error) throw new Error('Could not load the listing.')
  return data ? rowToListing(data) : null
}

export async function createListing(getToken: TokenGetter, input: ListingInput): Promise<Listing> {
  const { data, error } = await authenticatedDb(getToken)
    .from('listings')
    .insert({ ...inputToRow(input), host_id: input.hostId, auto_approve_bookings: input.autoApproveBookings ?? true })
    .select(listingPublicColumns)
    .single()
  if (error) throw new Error(`Could not save listing: ${error.message}`)
  return rowToListing(data as ListingRow)
}

export async function updateListing(getToken: TokenGetter, id: string, input: ListingInput): Promise<Listing> {
  const { data, error } = await authenticatedDb(getToken)
    .from('listings')
    .update(inputToRow(input))
    .eq('id', id)
    .select(listingPublicColumns)
    .single()
  if (error) throw new Error(`Could not update listing: ${error.message}`)
  return rowToListing(data as ListingRow)
}

/** Public profile results, or the host's own drafts when a session is passed. */
export async function fetchHostListings(hostId: string, getToken?: TokenGetter): Promise<Listing[]> {
  const db = getToken ? authenticatedDb(getToken) : supabase
  let query = db
    .from('listings')
    .select(listingPublicColumns)
    .eq('host_id', hostId)
    .order('created_at', { ascending: false })
  if (!getToken) query = query.not('pilot_approved_at', 'is', null)
  const { data, error } = await query
  if (error) return []
  return (data as ListingRow[]).map(rowToListing)
}
