import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import Hero from '../components/Hero'
import Carousel from '../components/Carousel'
import ListingCard from '../components/ListingCard'
import SearchFilters from '../components/SearchFilters'
import { listings as mockListings } from '../data/listings'
import { fetchListings, type ListingFilters } from '../utils/listingsApi'
import { useUserMode } from '../hooks/useUserMode'
import type { Listing } from '../bookingTypes'

const carouselSlides = [
  {
    src: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1600&q=60',
    alt: 'Catamaran at sunset',
  },
  {
    src: 'https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=1600&q=60',
    alt: 'Coastline harbor',
  },
  {
    src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=60',
    alt: 'Houseboat near city',
  },
  {
    src: 'https://images.unsplash.com/photo-1510826601749-74c1f2b63030?auto=format&fit=crop&w=1600&q=60',
    alt: 'Yacht pier at night',
  },
]

/** Marketing landing shown to signed-out visitors — the app is members-only. */
function GuestLanding() {
  return (
    <main>
      <Hero
        ctas={
          <>
            <Link to="/sign-up" className="btn btn-primary no-underline" aria-label="Create a free account">
              Get Started — It's Free
            </Link>
            <Link to="/sign-in" className="btn btn-secondary no-underline" aria-label="Sign in">
              Sign in
            </Link>
          </>
        }
      />
      <div className="mt-10">
        <Carousel slides={carouselSlides} />
      </div>

      <section aria-labelledby="join-heading" className="container-p mt-14 mb-16 text-center">
        <h2 id="join-heading" className="font-display text-3xl font-medium text-muted">
          Members see it all
        </h2>
        <p className="text-slate-500 mt-2 max-w-xl mx-auto">
          Create a free account to browse hundreds of boats, houseboats, and yachts —
          or switch to hosting and earn money with your own boat.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/sign-up" className="btn btn-primary no-underline">Create free account</Link>
          <Link to="/sign-in" className="btn btn-secondary no-underline">Sign in</Link>
        </div>
      </section>
    </main>
  )
}

/** The signed-in traveler experience: greeting + full listing grid. */
function TravelerHome() {
  const { user } = useUser()
  const firstName = user?.firstName
  const [listings, setListings] = useState<Listing[]>(mockListings)
  const [filters, setFilters] = useState<ListingFilters>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchListings(filters).then(all => {
      if (!cancelled) {
        setListings(all)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [filters])

  return (
    <main>
      <section className="container-p pt-10 pb-2">
        <h1 className="font-display text-4xl font-medium text-muted">
          {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        </h1>
        <p className="text-slate-500 mt-1">Where to next? Pick a boat and go.</p>
      </section>

      <div className="mt-6">
        <Carousel slides={carouselSlides} />
      </div>

      <section id="explore" aria-labelledby="featured-heading" className="container-p mt-12 mb-16">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 id="featured-heading" className="font-display text-3xl font-medium text-muted">
              Featured Listings
            </h2>
            <p className="text-slate-500 mt-1">Handpicked stays on boats and houseboats worldwide.</p>
          </div>
        </div>
        <SearchFilters filters={filters} onChange={setFilters} />
        {loading ? (
          <div className="text-slate-400 text-sm py-8 text-center">Loading listings…</div>
        ) : listings.length === 0 ? (
          <div className="text-slate-400 text-sm py-8 text-center">No listings match your search.</div>
        ) : (
          <ul role="list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((l) => (
              <li key={l.id}>
                <ListingCard item={l} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth()
  const { mode } = useUserMode()

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-slate-400 text-sm">Loading…</div>
      </div>
    )
  }

  if (!isSignedIn) {
    return <GuestLanding />
  }

  if (mode === 'hosting') {
    return <Navigate to="/hosting" replace />
  }

  return <TravelerHome />
}
