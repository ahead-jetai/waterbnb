import { authenticatedDb, listingPublicColumns, supabase, type TokenGetter } from './supabase'
import type { Booking, BookingStatus, Listing, RefundStatus } from '../bookingTypes'

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
}

export type BookingRow = {
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
  refund_cutoff_at?: string | null
  refund_status?: RefundStatus | null
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
    autoApproveBookings: row.auto_approve_bookings ?? true,
  }
}

const bookingColumns = 'id,listing_id,guest_id,check_in,check_out,guests,status,guest_name,guest_email,guest_phone,special_requests,subtotal,service_fee,total,booking_reference,created_at,refund_cutoff_at,refund_status'

/** Map a raw bookings row (e.g. returned by the payments edge function) to a Booking. */
export function rowToBooking(row: BookingRow): Booking {
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
    refundCutoffAt: row.refund_cutoff_at ?? undefined,
    refundStatus: row.refund_status ?? undefined,
    listing: row.listing ? listingRowToListing(row.listing) : undefined,
  }
}

/** Confirmed overnight ranges for a listing, with an exclusive checkout date. */
export async function fetchBookedDateRanges(listingId: string, getToken?: TokenGetter): Promise<{ checkIn: string; checkOut: string }[]> {
  return (await fetchUnavailableRanges(listingId, getToken)).filter(r => r.source === 'booking')
    .map(({ checkIn, checkOut }) => ({ checkIn, checkOut }))
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd)
}

export type UnavailableRange = {
  checkIn: string
  checkOut: string
  source: 'booking' | 'host'
}

type UnavailableRow = { listing_id: string; check_in: string; check_out: string; source: UnavailableRange['source'] }

async function fetchAvailability(args: { p_listing?: string; p_start?: string; p_end?: string }, getToken?: TokenGetter): Promise<UnavailableRow[]> {
  const { data, error } = await (getToken ? authenticatedDb(getToken) : supabase).rpc('marketplace_unavailable_dates', args)
  if (error) throw new Error('Could not load date availability.')
  return data as UnavailableRow[]
}

/** All dates a guest cannot book: confirmed bookings plus host-blocked ranges, soonest first. */
export async function fetchUnavailableRanges(listingId: string, getToken?: TokenGetter): Promise<UnavailableRange[]> {
  const rows = await fetchAvailability({ p_listing: listingId }, getToken)
  return rows.map(r => ({ checkIn: r.check_in, checkOut: r.check_out, source: r.source }))
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
}

/** True if the requested date range doesn't overlap any confirmed booking or host-blocked range for the listing. */
export async function isRangeAvailable(listingId: string, checkIn: string, checkOut: string): Promise<boolean> {
  const unavailable = await fetchUnavailableRanges(listingId)
  return !unavailable.some(b => rangesOverlap(checkIn, checkOut, b.checkIn, b.checkOut))
}

/** All bookings for a guest, newest first, with the related listing embedded. */
export async function fetchGuestBookings(getToken: TokenGetter, guestId: string): Promise<Booking[]> {
  const { data, error } = await authenticatedDb(getToken)
    .from('bookings')
    .select(`${bookingColumns},listing:listings(${listingPublicColumns})`)
    .eq('guest_id', guestId)
    .order('check_in', { ascending: false })
    .overrideTypes<BookingRow[], { merge: false }>()
  if (error) {
    console.error('Failed to fetch bookings:', error.message)
    return []
  }
  return data.map(rowToBooking)
}

/** All confirmed bookings on a host's listings, soonest check-in first, with the listing embedded. */
export async function fetchHostBookings(getToken: TokenGetter, hostId: string): Promise<Booking[]> {
  const { data, error } = await authenticatedDb(getToken)
    .from('bookings')
    .select(`${bookingColumns},listing:listings!inner(${listingPublicColumns})`)
    .eq('listing.host_id', hostId)
    .eq('status', 'confirmed')
    .order('check_in', { ascending: true })
    .overrideTypes<BookingRow[], { merge: false }>()
  if (error) {
    console.error('Failed to fetch host bookings:', error.message)
    return []
  }
  return data.map(rowToBooking)
}

/** Pending booking requests on a host's listings, oldest first, with the listing embedded. */
export async function fetchHostBookingRequests(getToken: TokenGetter, hostId: string): Promise<Booking[]> {
  const { data, error } = await authenticatedDb(getToken)
    .from('bookings')
    .select(`${bookingColumns},listing:listings!inner(${listingPublicColumns})`)
    .eq('listing.host_id', hostId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .overrideTypes<BookingRow[], { merge: false }>()
  if (error) {
    console.error('Failed to fetch host booking requests:', error.message)
    return []
  }
  return data.map(rowToBooking)
}

/** Listings with a booking or host block overlapping the selected dates. */
export async function fetchUnavailableListingIds(checkIn: string, checkOut: string): Promise<Set<string>> {
  const rows = await fetchAvailability({ p_start: checkIn, p_end: checkOut })
  return new Set(rows.map(r => r.listing_id))
}
