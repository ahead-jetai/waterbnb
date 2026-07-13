import Hero from '../components/Hero'
import Carousel from '../components/Carousel'
import ListingCard from '../components/ListingCard'
import { listings } from '../data/listings'

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

export default function HomePage() {
  return (
    <main>
      <Hero />
      <div className="mt-10">
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
          <a className="btn btn-secondary no-underline flex-shrink-0" href="#">View all</a>
        </div>
        <ul role="list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {listings.map((l) => (
            <li key={l.id}>
              <ListingCard item={l} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
