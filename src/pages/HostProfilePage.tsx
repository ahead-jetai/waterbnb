import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchHostProfile, computeHostRating, type HostProfile } from '../utils/hostProfilesApi'
import { fetchHostListings } from '../utils/listingsApi'
import ListingCard from '../components/ListingCard'
import type { Listing } from '../bookingTypes'

/** Public host page: photo, bio, overall rating, and all of the host's listings. */
export default function HostProfilePage() {
  const { hostId } = useParams<{ hostId: string }>()
  const [profile, setProfile] = useState<HostProfile | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hostId) return
    let cancelled = false
    Promise.all([fetchHostProfile(hostId), fetchHostListings(hostId)]).then(([p, ls]) => {
      if (cancelled) return
      setProfile(p)
      setListings(ls)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [hostId])

  if (loading) {
    return (
      <div className="container-p py-16 flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Loading host…</div>
      </div>
    )
  }

  if (!profile && listings.length === 0) {
    return (
      <div className="container-p py-16 text-center">
        <h1 className="font-display text-3xl font-semibold mb-4">Host not found</h1>
        <p className="text-slate-500 mb-8">This host doesn't exist or hasn't listed any boats yet.</p>
        <Link to="/" className="btn btn-primary no-underline">Back to Home</Link>
      </div>
    )
  }

  const name = profile?.name || 'WaterBnB host'
  const overall = computeHostRating(listings)

  return (
    <main className="bg-background min-h-screen">
      <div className="container-p py-10">
        {/* Host header */}
        <div className="card p-6 sm:p-8 mb-10 max-w-3xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={name}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-brand/20 flex-shrink-0"
              />
            ) : (
              <span className="inline-flex w-24 h-24 rounded-full bg-brand/10 text-brand items-center justify-center font-display text-3xl flex-shrink-0">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="text-center sm:text-left">
              <p className="text-brand text-sm font-medium uppercase tracking-wide">Your host</p>
              <h1 className="font-display text-3xl font-medium text-muted mt-1">{name}</h1>
              <div className="flex items-center justify-center sm:justify-start gap-4 mt-2 text-sm text-slate-600">
                {overall && (
                  <span className="flex items-center gap-1">
                    <span className="text-amber-500">★</span>
                    <span className="font-semibold">{overall.rating}</span>
                    <span className="text-slate-400">({overall.reviews} reviews)</span>
                  </span>
                )}
                <span>{listings.length} {listings.length === 1 ? 'listing' : 'listings'}</span>
              </div>
              {profile?.bio ? (
                <p className="text-slate-600 leading-relaxed mt-4">{profile.bio}</p>
              ) : (
                <p className="text-slate-400 text-sm mt-4">This host hasn't written a bio yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Host's listings */}
        <section aria-labelledby="host-listings-heading" className="pb-16">
          <h2 id="host-listings-heading" className="font-display text-2xl font-medium text-muted mb-6">
            {name}'s boats
          </h2>
          {listings.length === 0 ? (
            <p className="text-slate-400 text-sm">No active listings right now.</p>
          ) : (
            <ul role="list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map(l => (
                <li key={l.id}>
                  <ListingCard item={l} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
