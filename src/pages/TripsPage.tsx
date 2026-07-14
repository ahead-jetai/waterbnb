import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { fetchGuestBookings, cancelBooking } from '../utils/bookingsApi'
import { formatDateLong, pluralize, calculateNights } from '../utils/booking'
import type { Booking } from '../bookingTypes'

function isUpcoming(booking: Booking): boolean {
  return booking.status === 'confirmed' && new Date(booking.checkOut) >= new Date()
}

function TripCard({ booking, onCancel }: { booking: Booking; onCancel: (id: string) => void }) {
  const { listing } = booking
  const nights = calculateNights(booking.checkIn, booking.checkOut)
  const canCancel = isUpcoming(booking)

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
              booking.status === 'cancelled'
                ? 'bg-slate-100 text-slate-500'
                : 'bg-brand/10 text-brand'
            }`}
          >
            {booking.status === 'cancelled' ? 'Cancelled' : isUpcoming(booking) ? 'Upcoming' : 'Completed'}
          </span>
        </div>

        <div className="mt-3 text-sm text-slate-600 space-y-0.5">
          <div>{formatDateLong(booking.checkIn)} — {formatDateLong(booking.checkOut)} · {nights} {pluralize(nights, 'night')}</div>
          <div>{booking.guests} {pluralize(booking.guests, 'guest')}</div>
          <div className="font-medium text-slate-800">Total: ${booking.total.toFixed(2)}</div>
          <div className="text-xs text-slate-400">Ref: {booking.bookingReference}</div>
        </div>

        {canCancel && (
          <button
            onClick={() => onCancel(booking.id)}
            className="mt-3 text-sm text-danger hover:underline bg-transparent border-0 cursor-pointer p-0"
          >
            Cancel booking
          </button>
        )}
      </div>
    </div>
  )
}

export default function TripsPage() {
  const { user } = useUser()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

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
    if (!confirm('Cancel this booking?')) return
    try {
      await cancelBooking(id)
      setBookings(prev => prev.map(b => (b.id === id ? { ...b, status: 'cancelled' } : b)))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not cancel booking.')
    }
  }

  const upcoming = bookings.filter(isUpcoming)
  const past = bookings.filter(b => !isUpcoming(b))

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
            <h2 className="font-semibold text-lg mb-3">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-400">No upcoming trips.</p>
            ) : (
              <div className="space-y-4">
                {upcoming.map(b => <TripCard key={b.id} booking={b} onCancel={handleCancel} />)}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-3">Past</h2>
            {past.length === 0 ? (
              <p className="text-sm text-slate-400">No past trips.</p>
            ) : (
              <div className="space-y-4">
                {past.map(b => <TripCard key={b.id} booking={b} onCancel={handleCancel} />)}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
