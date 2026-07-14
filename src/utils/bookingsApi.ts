import { supabase } from './supabase'
import type { Booking, BookingStatus, GuestDetails, Listing } from '../bookingTypes'

export type CreateBookingInput = {
  listingId: string
  guestId: string
  checkIn: string
  checkOut: string
  guests: number
  guestDetails: GuestDetails
  subtotal: number
  serviceFee: number
  total: number
  bookingReference: string
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
}

type BookingRow = {
  id: string
  listing_id: string
  guest_id: string
  check_in: string
  check_out: string
  guests: number
  status: BookingStatus
  guest_name: string
  guest_email: string
  guest_phone: string
  special_requests: string | null
  subtotal: number
  service_fee: number
  total: number
  booking_reference: string
  created_at: string
  listing?: ListingRow | null
}

function listingRowToListing(row: ListingRow): Listing {
  return {
    id: row.id,
    title: row.title,
    location: row.location,
    pricePerNight: Number(row.price_per_night),
    rating: Number(row.rating ?? 0),
    reviews: row.reviews ?? 0,
    image: row.images?.[0] ?? row.image ?? '',
    images: row.images?.length ? row.images : row.image ? [row.image] : [],
    tags: row.amenities,
    description: row.description,
    capacity: row.capacity,
    boatType: row.boat_type,
    hostId: row.host_id ?? undefined,
  }
}

function rowToBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    listingId: row.listing_id,
    guestId: row.guest_id,
    checkIn: row.check_in,
    checkOut: row.check_out,
    guests: row.guests,
    status: row.status,
    guestDetails: {
      name: row.guest_name,
      email: row.guest_email,
      phone: row.guest_phone,
      specialRequests: row.special_requests ?? undefined,
    },
    subtotal: Number(row.subtotal),
    serviceFee: Number(row.service_fee),
    total: Number(row.total),
    bookingReference: row.booking_reference,
    createdAt: row.created_at,
    listing: row.listing ? listingRowToListing(row.listing) : undefined,
  }
}

/** Date ranges (inclusive) currently booked for a listing — used to block unavailable dates. */
export async function fetchBookedDateRanges(listingId: string): Promise<{ checkIn: string; checkOut: string }[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('check_in, check_out')
    .eq('listing_id', listingId)
    .eq('status', 'confirmed')
  if (error) {
    console.error('Failed to fetch booked dates:', error.message)
    return []
  }
  return (data as Pick<BookingRow, 'check_in' | 'check_out'>[]).map(r => ({ checkIn: r.check_in, checkOut: r.check_out }))
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd)
}

/** True if the requested date range doesn't overlap any confirmed booking for the listing. */
export async function isRangeAvailable(listingId: string, checkIn: string, checkOut: string): Promise<boolean> {
  const booked = await fetchBookedDateRanges(listingId)
  return !booked.some(b => rangesOverlap(checkIn, checkOut, b.checkIn, b.checkOut))
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  // Re-check availability right before insert to close the race between selecting dates and paying.
  const available = await isRangeAvailable(input.listingId, input.checkIn, input.checkOut)
  if (!available) {
    throw new Error('Sorry, those dates were just booked by someone else. Please choose different dates.')
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      listing_id: input.listingId,
      guest_id: input.guestId,
      check_in: input.checkIn,
      check_out: input.checkOut,
      guests: input.guests,
      status: 'confirmed',
      guest_name: input.guestDetails.name,
      guest_email: input.guestDetails.email,
      guest_phone: input.guestDetails.phone,
      special_requests: input.guestDetails.specialRequests || null,
      subtotal: input.subtotal,
      service_fee: input.serviceFee,
      total: input.total,
      booking_reference: input.bookingReference,
    })
    .select()
    .single()
  if (error) throw new Error(`Could not save booking: ${error.message}`)
  return rowToBooking(data as BookingRow)
}

/** All bookings for a guest, newest first, with the related listing embedded. */
export async function fetchGuestBookings(guestId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, listing:listings(*)')
    .eq('guest_id', guestId)
    .order('check_in', { ascending: false })
  if (error) {
    console.error('Failed to fetch bookings:', error.message)
    return []
  }
  return (data as BookingRow[]).map(rowToBooking)
}

/** Ids of listings with a confirmed booking overlapping the given date range — used to exclude them from search results. */
export async function fetchUnavailableListingIds(checkIn: string, checkOut: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('bookings')
    .select('listing_id, check_in, check_out')
    .eq('status', 'confirmed')
    .lt('check_in', checkOut)
    .gt('check_out', checkIn)
  if (error) {
    console.error('Failed to fetch unavailable listings:', error.message)
    return new Set()
  }
  return new Set((data as Pick<BookingRow, 'listing_id'>[]).map(r => r.listing_id))
}

export async function cancelBooking(id: string): Promise<void> {
  const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
  if (error) throw new Error(`Could not cancel booking: ${error.message}`)
}
