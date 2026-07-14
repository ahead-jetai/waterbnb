import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useUserMode } from '../hooks/useUserMode'
import { fetchHostListings } from '../utils/listingsApi'
import type { Listing } from '../bookingTypes'

/** Hosting-mode home: the host's dashboard. */
export default function HostingHomePage() {
  const { user } = useUser()
  const { mode, isLoaded } = useUserMode()
  const firstName = user?.firstName
  const [myListings, setMyListings] = useState<Listing[]>([])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    fetchHostListings(user.id).then(ls => { if (!cancelled) setMyListings(ls) })
    return () => { cancelled = true }
  }, [user?.id])

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

      <section aria-label="Hosting overview" className="container-p grid grid-cols-1 sm:grid-cols-3 gap-4 pb-8">
        <div className="card p-5">
          <p className="text-sm text-slate-500">Active listings</p>
          <p className="font-display text-3xl font-medium text-muted mt-1">{myListings.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Upcoming reservations</p>
          <p className="font-display text-3xl font-medium text-muted mt-1">0</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Earnings this month</p>
          <p className="font-display text-3xl font-medium text-muted mt-1">$0</p>
        </div>
      </section>

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
