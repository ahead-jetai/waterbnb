import { supabase } from './supabase'
import { listings as mockListings } from '../data/listings'
import { fetchUnavailableListingIds } from './bookingsApi'
import type { Listing } from '../bookingTypes'

export type ListingFilters = {
  location?: string
  minPrice?: number
  maxPrice?: number
  boatType?: string
  checkIn?: string
  checkOut?: string
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
    host_id: input.hostId ?? null,
    // keep legacy columns in sync
    image: input.images[0] ?? '',
    tags: input.amenities,
  }
}

/** All listings, newest first, optionally narrowed by location/price/boat type/date availability. Falls back to the bundled demo data if Supabase is unreachable. */
export async function fetchListings(filters?: ListingFilters): Promise<Listing[]> {
  let query = supabase.from('listings').select('*').order('created_at', { ascending: false })
  if (filters?.location) query = query.ilike('location', `%${filters.location}%`)
  if (filters?.boatType) query = query.eq('boat_type', filters.boatType)
  if (filters?.minPrice != null) query = query.gte('price_per_night', filters.minPrice)
  if (filters?.maxPrice != null) query = query.lte('price_per_night', filters.maxPrice)

  const { data, error } = await query
  if (error) {
    console.error('Failed to fetch listings:', error.message)
    return mockListings
  }
  let result = (data as ListingRow[]).map(rowToListing)

  if (filters?.checkIn && filters?.checkOut) {
    const unavailable = await fetchUnavailableListingIds(filters.checkIn, filters.checkOut)
    result = result.filter(l => !unavailable.has(l.id))
  }

  return result
}

/** Single listing by id — from Supabase, falling back to the bundled demo data. */
export async function fetchListing(id: string): Promise<Listing | null> {
  const { data, error } = await supabase.from('listings').select('*').eq('id', id).maybeSingle()
  if (data) return rowToListing(data as ListingRow)
  if (error) console.error('Failed to fetch listing:', error.message)
  return mockListings.find(l => l.id === id) ?? null
}

export async function createListing(input: ListingInput): Promise<Listing> {
  const { data, error } = await supabase
    .from('listings')
    .insert(inputToRow(input))
    .select()
    .single()
  if (error) throw new Error(`Could not save listing: ${error.message}`)
  return rowToListing(data as ListingRow)
}

export async function updateListing(id: string, input: ListingInput): Promise<Listing> {
  const { data, error } = await supabase
    .from('listings')
    .update(inputToRow(input))
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`Could not update listing: ${error.message}`)
  return rowToListing(data as ListingRow)
}

/** Listings owned by a host, newest first. */
export async function fetchHostListings(hostId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data as ListingRow[]).map(rowToListing)
}
