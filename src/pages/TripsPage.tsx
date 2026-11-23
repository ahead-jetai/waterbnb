import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import { fetchGuestBookings } from '../utils/bookingsApi'
import { cancelBooking } from '../utils/paymentsApi'
import { formatDateLong, pluralize, calculateNights } from '../utils/booking'
import type { Booking } from '../bookingTypes'

function isUpcoming(booking: Booking, now: number): boolean {
  return booking.status === 'confirmed' && Date.parse(booking.checkOut) >= now
}

function statusLabel(booking: Booking, now: number): string {
  if (booking.status === 'pending') return 'Pending host approval'
  if (booking.status === 'approved_payment_pending') return 'Approved — payment due'
  if (booking.status === 'checkout_pending') return 'Checkout started'
  if (booking.status === 'declined') return 'Declined'
  if (booking.status === 'expired') return 'Expired'
  if (booking.status === 'cancelled') return 'Cancelled'
  return isUpcoming(booking, now) ? 'Upcoming' : 'Completed'
}

function isPending(booking: Booking) {
  return ['pending', 'approved_payment_pending', 'checkout_pending'].includes(booking.status)
}

function TripCard({ booking, now, onCancel, cancelling }: {
  booking: Booking; now: number; onCancel: (id: string) => void; cancelling?: boolean
}) {
  const { listing } = booking
  const nights = calculateNights(booking.checkIn, booking.checkOut)
  const cutoff = booking.refundCutoffAt ? new Date(booking.refundCutoffAt) : null
  const refundInProgress = booking.refundStatus === 'pending' || booking.refundStatus === 'requested'
  const upcoming = isUpcoming(booking, now)
  const canCancel = upcoming && booking.refundStatus !== 'failed' &&
    (refundInProgress || (cutoff && cutoff.getTime() >= now))

  return (
    <div className="card p-5 flex flex-col sm:flex-row gap-4">
      {listing?.image && (
        <img
          src={listing.image}
          alt={listing.title}
          className="w-full sm:w-40 h-28 object-cover rounded-lg flex-shrink-0"
        />
      )}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base">
              {listing ? (
                <Link to={`/listing/${listing.id}`} className="no-underline text-slate-900 hover:text-brand">
                  {listing.title}
                </Link>
              ) : (
                'Listing no longer available'
              )}
            </h3>
            {listing?.location && <p className="text-sm text-slate-500 mt-0.5">{listing.location}</p>}
          </div>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
              booking.status === 'cancelled' || booking.status === 'declined' || booking.status === 'expired'
                ? 'bg-slate-100 text-slate-500'
                : isPending(booking)
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-brand/10 text-brand'
            }`}
          >
            {statusLabel(booking, now)}
          </span>
        </div>

        <div className="mt-3 text-sm text-slate-600 space-y-0.5">
          <div>{formatDateLong(booking.checkIn)} — {formatDateLong(booking.checkOut)} · {nights} {pluralize(nights, 'night')}</div>
          <div>{booking.guests} {pluralize(booking.guests, 'guest')}</div>
          <div className="font-medium text-slate-800">Total: ${booking.total.toFixed(2)}</div>
          <div className="text-xs text-slate-400">Ref: {booking.bookingReference}</div>
        </div>

        {(booking.status === 'approved_payment_pending' || booking.status === 'checkout_pending') && (
          <Link
            to={`/booking/${booking.listingId}/payment?booking_id=${booking.id}`}
            className="btn btn-primary no-underline mt-3 inline-flex text-sm py-1.5 px-3"
          >
            {booking.status === 'checkout_pending' ? 'Resume checkout' : 'Pay now to confirm'}
          </Link>
        )}

        {upcoming && (
          <p className="text-xs text-slate-600 mt-3">
            {booking.refundStatus === 'failed' ? 'The refund failed. Your reservation remains active; contact support.'
              : refundInProgress ? 'Refund requested. Your reservation remains active until the refund succeeds.'
              : canCancel && cutoff ? `Full refund including fees until ${cutoff.toLocaleString()} (your local time).`
              : 'Automatic cancellation is unavailable. Contact support to request a change.'}
          </p>
        )}
        {booking.refundStatus === 'succeeded' && <p className="text-xs text-slate-600 mt-3">Full refund issued.</p>}

        {canCancel && (
          <button
            onClick={() => onCancel(booking.id)}
            disabled={cancelling}
            className="mt-3 text-sm text-danger hover:underline bg-transparent border-0 cursor-pointer p-0"
          >
            {refundInProgress ? 'Check refund status' : 'Cancel booking for a full refund'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function TripsPage() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetchGuestBookings(user.id).then(all => {
      if (!cancelled) {
        setBookings(all)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [user])

  const handleCancel = async (id: string) => {
    const booking = bookings.find(b => b.id === id)
    if (!booking || cancelling) return
    if (!booking.refundStatus && !confirm('Cancel this booking and request a full refund?')) return
    setCancelling(id)
    try {
      const result = await cancelBooking(getToken, id)
      setBookings(prev => prev.map(b => (b.id === id ? { ...b, ...result } : b)))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not cancel booking.')
    } finally {
      setCancelling(null)
    }
  }

  const pending = bookings.filter(isPending)
  const upcoming = bookings.filter(b => isUpcoming(b, now))
  const past = bookings.filter(b => !isPending(b) && !isUpcoming(b, now))

  if (loading) {
    return (
      <div className="container-p py-16 flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Loading your trips…</div>
      </div>
    )
  }

  return (
    <div className="container-p py-8 max-w-4xl">
      <h1 className="font-display text-3xl font-medium text-muted mb-6">My Trips</h1>

      {bookings.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-slate-500 mb-4">You don't have any trips yet.</p>
          <Link to="/" className="btn btn-primary no-underline">Explore listings</Link>
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="font-semibold text-lg mb-3">Pending requests</h2>
            {pending.length === 0 ? (
              <p className="text-sm text-slate-400">No pending requests.</p>
            ) : (
              <div className="space-y-4">
                {pending.map(b => <TripCard key={b.id} booking={b} now={now} onCancel={handleCancel} />)}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-3">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-400">No upcoming trips.</p>
            ) : (
              <div className="space-y-4">
                {upcoming.map(b => <TripCard key={b.id} booking={b} now={now} onCancel={handleCancel} cancelling={cancelling !== null} />)}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-3">Past</h2>
            {past.length === 0 ? (
              <p className="text-sm text-slate-400">No past trips.</p>
            ) : (
              <div className="space-y-4">
                {past.map(b => <TripCard key={b.id} booking={b} now={now} onCancel={handleCancel} />)}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
