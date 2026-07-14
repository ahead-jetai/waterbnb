import { supabase } from './supabase'
import type { Listing } from '../bookingTypes'

/**
 * Booking analytics for the host dashboard, computed client-side from the
 * app's own bookings data. Stripe answers "how much money moved"; this module
 * answers "why" — which listings earn, how full the calendar is, and what a
 * competitive nightly price looks like given how similar boats book.
 */

const DAY_MS = 86_400_000
const OCCUPANCY_WINDOW_DAYS = 60

type AnalyticsBookingRow = {
  listing_id: string
  check_in: string
  check_out: string
  guests: number
  subtotal: number
  created_at: string
}

type MarketBookingRow = AnalyticsBookingRow & {
  listing: { boat_type: string; price_per_night: number; host_id: string | null } | null
}

export type MonthlyRevenue = {
  month: string // e.g. "Feb 2026"
  revenue: number
  nights: number
}

export type PriceRecommendation = {
  price: number
  reason: string
  direction: 'raise' | 'lower' | 'keep'
}

export type ListingAnalytics = {
  listing: Listing
  bookingsCount: number
  nightsBooked: number
  revenue: number // host earnings = booking subtotals
  avgNightlyRate: number // realized ADR, 0 when never booked
  occupancyNext60: number // 0..1 share of the next 60 days already booked
  nextCheckIn: string | null
  recommendation: PriceRecommendation
}

export type HostAnalytics = {
  totalRevenue: number
  revenueThisMonth: number
  upcomingBookings: number
  upcomingRevenue: number
  nightsBooked: number
  avgBookingValue: number
  avgLeadTimeDays: number | null
  monthly: MonthlyRevenue[]
  listings: ListingAnalytics[]
}

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / DAY_MS))
}

/** Nights of [checkIn, checkOut) that fall inside [windowStart, windowEnd). */
function nightsInWindow(checkIn: string, checkOut: string, windowStart: Date, windowEnd: Date): number {
  const start = Math.max(new Date(checkIn).getTime(), windowStart.getTime())
  const end = Math.min(new Date(checkOut).getTime(), windowEnd.getTime())
  return Math.max(0, Math.round((end - start) / DAY_MS))
}

function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Recommend a nightly price by blending the market rate for the same boat
 * type (realized booked rates when available, list prices otherwise) with a
 * demand signal from the listing's own occupancy.
 */
function recommendPrice(
  listing: Listing,
  occupancyNext60: number,
  bookingsCount: number,
  marketBookedRates: number[],
  marketListPrices: number[],
): PriceRecommendation {
  const current = listing.pricePerNight
  const marketRate = median(marketBookedRates) ?? median(marketListPrices)
  const marketNote =
    median(marketBookedRates) !== null
      ? `similar ${listing.boatType ?? 'boat'}s book at ~$${Math.round(median(marketBookedRates)!)}/night`
      : marketRate !== null
        ? `similar ${listing.boatType ?? 'boat'}s list at ~$${Math.round(marketRate)}/night`
        : null

  // Demand multiplier: a busy calendar supports charging more; an empty one
  // suggests the price is above what guests will pay.
  const demandFactor = occupancyNext60 >= 0.6 ? 1.1 : occupancyNext60 <= 0.15 && bookingsCount === 0 ? 0.9 : 1

  // Anchor halfway between the current price and the market, then apply demand.
  const anchor = marketRate !== null ? (current + marketRate) / 2 : current
  const price = Math.max(10, Math.round(anchor * demandFactor))

  const delta = price - current
  if (Math.abs(delta) < Math.max(5, current * 0.03)) {
    return {
      price: current,
      direction: 'keep',
      reason: marketNote
        ? `Your price is in line with the market — ${marketNote}.`
        : 'Not enough booking data yet to suggest a change.',
    }
  }
  if (delta > 0) {
    return {
      price,
      direction: 'raise',
      reason:
        occupancyNext60 >= 0.6
          ? `Your next ${OCCUPANCY_WINDOW_DAYS} days are ${Math.round(occupancyNext60 * 100)}% booked${marketNote ? ` and ${marketNote}` : ''} — demand supports a higher rate.`
          : `You're priced below the market${marketNote ? ` — ${marketNote}` : ''}.`,
    }
  }
  return {
    price,
    direction: 'lower',
    reason:
      bookingsCount === 0
        ? `No bookings yet${marketNote ? ` and ${marketNote}` : ''} — a lower price can win your first reviews.`
        : `You're priced above the market${marketNote ? ` — ${marketNote}` : ''}.`,
  }
}

/** Full analytics bundle for one host: totals, monthly trend, and per-listing stats. */
export async function fetchHostAnalytics(hostId: string, listings: Listing[]): Promise<HostAnalytics> {
  const listingIds = listings.map(l => l.id)

  const [own, market] = await Promise.all([
    listingIds.length
      ? supabase
          .from('bookings')
          .select('listing_id, check_in, check_out, guests, subtotal, created_at')
          .in('listing_id', listingIds)
          .eq('status', 'confirmed')
      : Promise.resolve({ data: [], error: null }),
    // All confirmed bookings in the app, with enough listing context to
    // derive market rates per boat type.
    supabase
      .from('bookings')
      .select('listing_id, check_in, check_out, guests, subtotal, created_at, listing:listings(boat_type, price_per_night, host_id)')
      .eq('status', 'confirmed'),
  ])
  if (own.error) throw new Error(`Could not load bookings: ${own.error.message}`)

  const bookings = (own.data ?? []) as AnalyticsBookingRow[]
  const marketBookings = ((market.error ? [] : market.data) ?? []) as unknown as MarketBookingRow[]

  // List prices of everyone else's listings, per boat type — the fallback
  // market signal when there are too few bookings to trust realized rates.
  const { data: allListings } = await supabase
    .from('listings')
    .select('boat_type, price_per_night, host_id')
  const listPricesByType = new Map<string, number[]>()
  for (const l of allListings ?? []) {
    if (l.host_id === hostId) continue
    const arr = listPricesByType.get(l.boat_type) ?? []
    arr.push(Number(l.price_per_night))
    listPricesByType.set(l.boat_type, arr)
  }

  // Realized nightly rates by boat type from other hosts' bookings.
  const bookedRatesByType = new Map<string, number[]>()
  for (const b of marketBookings) {
    if (!b.listing || b.listing.host_id === hostId) continue
    const nights = nightsBetween(b.check_in, b.check_out)
    if (!nights) continue
    const arr = bookedRatesByType.get(b.listing.boat_type) ?? []
    arr.push(Number(b.subtotal) / nights)
    bookedRatesByType.set(b.listing.boat_type, arr)
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const windowEnd = new Date(today.getTime() + OCCUPANCY_WINDOW_DAYS * DAY_MS)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // --- Host-level totals -----------------------------------------------
  let totalRevenue = 0
  let revenueThisMonth = 0
  let upcomingBookings = 0
  let upcomingRevenue = 0
  let nightsBooked = 0
  const leadTimes: number[] = []

  // Last 6 calendar months of revenue, keyed chronologically.
  const monthly: MonthlyRevenue[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), revenue: 0, nights: 0 }
  })
  const monthIndex = (d: Date) =>
    (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth() + 5

  for (const b of bookings) {
    const revenue = Number(b.subtotal)
    const nights = nightsBetween(b.check_in, b.check_out)
    const checkIn = new Date(b.check_in)
    totalRevenue += revenue
    nightsBooked += nights
    if (checkIn >= monthStart && checkIn < new Date(now.getFullYear(), now.getMonth() + 1, 1)) {
      revenueThisMonth += revenue
    }
    if (checkIn >= today) {
      upcomingBookings += 1
      upcomingRevenue += revenue
    }
    const mi = monthIndex(checkIn)
    if (mi >= 0 && mi < 6) {
      monthly[mi].revenue += revenue
      monthly[mi].nights += nights
    }
    leadTimes.push((checkIn.getTime() - new Date(b.created_at).getTime()) / DAY_MS)
  }

  // --- Per-listing stats --------------------------------------------------
  const listingAnalytics = listings.map(listing => {
    const mine = bookings.filter(b => b.listing_id === listing.id)
    const revenue = mine.reduce((s, b) => s + Number(b.subtotal), 0)
    const nights = mine.reduce((s, b) => s + nightsBetween(b.check_in, b.check_out), 0)
    const bookedInWindow = mine.reduce((s, b) => s + nightsInWindow(b.check_in, b.check_out, today, windowEnd), 0)
    const occupancyNext60 = Math.min(1, bookedInWindow / OCCUPANCY_WINDOW_DAYS)
    const upcoming = mine
      .filter(b => new Date(b.check_in) >= today)
      .sort((a, b) => a.check_in.localeCompare(b.check_in))

    return {
      listing,
      bookingsCount: mine.length,
      nightsBooked: nights,
      revenue,
      avgNightlyRate: nights ? revenue / nights : 0,
      occupancyNext60,
      nextCheckIn: upcoming[0]?.check_in ?? null,
      recommendation: recommendPrice(
        listing,
        occupancyNext60,
        mine.length,
        bookedRatesByType.get(listing.boatType ?? '') ?? [],
        listPricesByType.get(listing.boatType ?? '') ?? [],
      ),
    }
  })

  return {
    totalRevenue,
    revenueThisMonth,
    upcomingBookings,
    upcomingRevenue,
    nightsBooked,
    avgBookingValue: bookings.length ? totalRevenue / bookings.length : 0,
    avgLeadTimeDays: leadTimes.length ? leadTimes.reduce((s, v) => s + v, 0) / leadTimes.length : null,
    monthly,
    listings: listingAnalytics.sort((a, b) => b.revenue - a.revenue),
  }
}
