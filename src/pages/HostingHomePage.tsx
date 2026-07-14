import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useUserMode } from '../hooks/useUserMode'
import { fetchHostListings } from '../utils/listingsApi'
import { fetchHostAnalytics, type HostAnalytics } from '../utils/hostAnalyticsApi'
import { fetchHostBookings } from '../utils/bookingsApi'
import { calculateNights, formatDateLong, pluralize } from '../utils/booking'
import type { Booking, Listing } from '../bookingTypes'

/** Hosting-mode home: the host's dashboard. */
export default function HostingHomePage() {
  const { user } = useUser()
  const { mode, isLoaded } = useUserMode()
  const firstName = user?.firstName
  const [myListings, setMyListings] = useState<Listing[]>([])
  const [analytics, setAnalytics] = useState<HostAnalytics | null>(null)
  const [reservations, setReservations] = useState<Booking[]>([])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    fetchHostListings(user.id).then(ls => {
      if (cancelled) return
      setMyListings(ls)
      fetchHostAnalytics(user.id, ls)
        .then(a => { if (!cancelled) setAnalytics(a) })
        .catch(() => {}) // dashboard cards just stay at their placeholders
    })
    fetchHostBookings(user.id).then(bs => { if (!cancelled) setReservations(bs) })
    return () => { cancelled = true }
  }, [user?.id])

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = reservations.filter(b => b.checkOut >= today)

  // If the user lands here while in traveling mode, send them home.
  if (isLoaded && mode !== 'hosting') {
    return <Navigate to="/" replace />
  }

  return (
    <main className="bg-background min-h-screen">
      <section className="container-p pt-10 pb-6">
        <p className="text-brand text-sm font-medium uppercase tracking-wide">Hosting</p>
        <h1 className="font-display text-4xl font-medium text-muted mt-1">
          {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        </h1>
        <p className="text-slate-500 mt-1">Manage your boats and grow your earnings.</p>
      </section>

      <section aria-label="Hosting overview" className="container-p grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4">
        <div className="card p-5">
          <p className="text-sm text-slate-500">Active listings</p>
          <p className="font-display text-3xl font-medium text-muted mt-1">{myListings.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Upcoming reservations</p>
          <p className="font-display text-3xl font-medium text-muted mt-1">{analytics?.upcomingBookings ?? 0}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Earnings this month</p>
          <p className="font-display text-3xl font-medium text-muted mt-1">
            ${Math.round(analytics?.revenueThisMonth ?? 0).toLocaleString('en-US')}
          </p>
        </div>
      </section>

      <section className="container-p pb-8">
        <Link to="/host/earnings" className="text-brand hover:text-brand-dark no-underline text-sm font-medium">
          View earnings & analytics →
        </Link>
      </section>

      {upcoming.length > 0 && (
        <section aria-labelledby="reservations-heading" className="container-p pb-8">
          <h2 id="reservations-heading" className="font-display text-2xl font-medium text-muted mb-4">
            Upcoming reservations
          </h2>
          <ul role="list" className="space-y-4">
            {upcoming.map(b => {
              const nights = calculateNights(b.checkIn, b.checkOut)
              return (
                <li key={b.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {b.listing ? (
                          <Link to={`/listing/${b.listing.id}`} className="no-underline text-slate-900 hover:text-brand">
                            {b.listing.title}
                          </Link>
                        ) : 'Listing'}
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {formatDateLong(b.checkIn)} → {formatDateLong(b.checkOut)} · {nights} {pluralize(nights, 'night')} · {b.guests} {pluralize(b.guests, 'guest')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-semibold text-brand">
                        ${b.subtotal.toLocaleString('en-US')}
                        <span className="text-xs text-slate-400 font-sans"> your earnings</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Ref {b.bookingReference}</p>
                    </div>
                  </div>

                  <dl className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-slate-400 text-xs">Guest</dt>
                      <dd className="font-medium text-slate-700">{b.guestDetails.name}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 text-xs">Email</dt>
                      <dd className="font-medium text-slate-700 truncate">
                        <a href={`mailto:${b.guestDetails.email}`} className="no-underline text-slate-700 hover:text-brand">
                          {b.guestDetails.email}
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 text-xs">Phone</dt>
                      <dd className="font-medium text-slate-700">{b.guestDetails.phone || '—'}</dd>
                    </div>
                  </dl>

                  {b.guestDetails.specialRequests && (
                    <p className="mt-3 text-sm text-slate-600 bg-brand/5 rounded-lg px-3 py-2">
                      <span className="font-medium text-slate-700">Special requests: </span>
                      {b.guestDetails.specialRequests}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="listings-heading" className="container-p pb-16">
        {myListings.length === 0 ? (
          <div className="card p-8 text-center">
            <h2 id="listings-heading" className="font-display text-2xl font-medium text-muted">
              You don't have any listings yet
            </h2>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">
              List your boat in a few minutes and start earning. Hosts in your area
              average $2,400 a month.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link to="/host/list" className="btn btn-primary no-underline">
                Create a listing
              </Link>
              <Link to="/host" className="btn btn-secondary no-underline">
                Learn about hosting
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-4 mb-6">
              <h2 id="listings-heading" className="font-display text-2xl font-medium text-muted">
                Your listings
              </h2>
              <Link to="/host/list" className="btn btn-primary no-underline">
                + New listing
              </Link>
            </div>
            <ul role="list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myListings.map(l => (
                <li key={l.id} className="card overflow-hidden">
                  <Link to={`/listing/${l.id}`} className="block no-underline">
                    {l.image ? (
                      <img src={l.image} alt={l.title} className="w-full h-44 object-cover" />
                    ) : (
                      <div className="w-full h-44 bg-slate-100" />
                    )}
                  </Link>
                  <div className="p-4">
                    <p className="font-semibold text-slate-900 truncate">{l.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{l.location}</p>
                    <p className="font-display font-semibold text-brand mt-1">
                      ${l.pricePerNight}<span className="text-xs text-slate-400 font-sans">/night</span>
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Link to={`/host/list/${l.id}/edit`} className="btn btn-secondary no-underline text-sm py-1.5 px-3 flex-1 text-center">
                        Edit
                      </Link>
                      <Link to={`/host/list/${l.id}/availability`} className="btn btn-secondary no-underline text-sm py-1.5 px-3 flex-1 text-center">
                        Calendar
                      </Link>
                      <Link to={`/listing/${l.id}`} className="btn btn-primary no-underline text-sm py-1.5 px-3 flex-1 text-center">
                        View
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  )
}
