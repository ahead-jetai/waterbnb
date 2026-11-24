import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import Hero from '../components/Hero'
import Carousel from '../components/Carousel'
import ListingCard from '../components/ListingCard'
import SearchFilters from '../components/SearchFilters'
import { fetchListings, type ListingFilters } from '../utils/listingsApi'
import { useUserMode } from '../hooks/useUserMode'
import type { Listing } from '../bookingTypes'
import { SupportLink } from '../components/SupportLink'

// Served from public/images — bundled with the app, no external hosts to fail.
const carouselSlides = [
  { src: '/images/water-bnb-hero-carousel-1.png', alt: 'Boat moored on calm water' },
  { src: '/images/water-bnb-hero-carousel-2.png', alt: 'Waterfront stay at golden hour' },
  { src: '/images/water-bnb-hero-carousel-3.png', alt: 'Houseboat on the water' },
  { src: '/images/water-bnb-hero-carousel-5.png', alt: 'Friends jumping off a yacht into a coastal bay' },
  { src: '/images/water-bnb-hero-carousel-6.png', alt: 'Catamaran anchored by a tropical beach' },
  { src: '/images/water-bnb-hero-carousel-7.png', alt: 'Boat party in turquoise water' },
  { src: '/images/water-bnb-hero-carousel-8.png', alt: 'Yoga session on bohemian houseboats' },
  { src: '/images/water-bnb-hero.png', alt: 'Boats on the water at sunset' },
]

/** Marketing landing shown to signed-out visitors — the app is members-only. */
function GuestLanding() {
  return (
    <main>
      <Hero
        ctas={
          <>
            <SupportLink topic="invite" className="btn btn-primary no-underline">Request an invite</SupportLink>
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
          Start with the Los Angeles pilot
        </h2>
        <p className="text-slate-500 mt-2 max-w-xl mx-auto">
          We're starting with invitation-only, moored overnight stays. The demo is open to everyone and does not create a booking.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/demo" className="btn btn-secondary no-underline">Try the demo</Link>
        </div>
      </section>
    </main>
  )
}

/** The signed-in traveler experience: greeting + full listing grid. */
function TravelerHome() {
  const { user } = useUser()
  const firstName = user?.firstName
  const [filters, setFilters] = useState<ListingFilters>({})
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ filters: ListingFilters; attempt: number; listings: Listing[] | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchListings(filters).then(all => {
      if (!cancelled) setResult({ filters, attempt, listings: all })
    }).catch(() => {
      if (!cancelled) setResult({ filters, attempt, listings: null })
    })
    return () => { cancelled = true }
  }, [filters, attempt])

  const current = result?.filters === filters && result.attempt === attempt ? result : null
  const hasFilters = Boolean(filters.location || filters.boatType || filters.checkIn || filters.checkOut ||
    filters.minPrice != null || filters.maxPrice != null)
  const sortedListings = useMemo(() => {
    const sorted = [...(current?.listings ?? [])]
    const sort = filters.sort ?? 'newest'
    if (sort === 'price-asc') {
      sorted.sort((a, b) => a.pricePerNight - b.pricePerNight)
    } else if (sort === 'price-desc') {
      sorted.sort((a, b) => b.pricePerNight - a.pricePerNight)
    } else if (sort === 'rating') {
      sorted.sort((a, b) => b.rating - a.rating)
    }
    return sorted
  }, [current, filters.sort])

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
            <p className="text-slate-500 mt-1">Approved stays in the Los Angeles pilot. Booking requires an invitation.</p>
          </div>
        </div>
        <SearchFilters filters={filters} onChange={setFilters} />
        {!current ? (
          <div role="status" className="text-slate-400 text-sm py-8 text-center">Loading listings…</div>
        ) : current.listings === null ? (
          <div className="card p-6 text-center space-y-3">
            <p role="alert">We couldn't load live listings. Try again in a moment.</p>
            <button type="button" className="btn btn-secondary" onClick={() => setAttempt(n => n + 1)}>Try again</button>
          </div>
        ) : sortedListings.length === 0 ? (
          <div className="card p-6 text-center space-y-3">
            <p>{hasFilters ? 'No listings match your search.' : 'No approved stays are listed yet.'}</p>
            {hasFilters
              ? <button type="button" className="btn btn-secondary" onClick={() => setFilters({ sort: filters.sort })}>Clear filters</button>
              : <Link to="/demo" className="btn btn-secondary no-underline">Try the demo</Link>}
          </div>
        ) : (
          <ul role="list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedListings.map((l) => (
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
