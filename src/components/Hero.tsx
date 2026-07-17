import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface HeroProps {
  /** Override the call-to-action buttons (defaults to explore/host links). */
  ctas?: ReactNode
}

export default function Hero({ ctas }: HeroProps) {
  return (
    <section className="relative isolate" aria-label="Hero section">
      <div className="absolute inset-0 -z-10">
        <img
          src="/images/water-bnb-hero-carousel-4.png"
          alt="Yacht anchored on clear blue water"
          fetchPriority="high"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-muted/80 via-muted/55 to-black/20" />
      </div>

      <div className="container-p pt-24 pb-20 sm:pt-32 sm:pb-24 lg:pt-40 lg:pb-28 text-white">
        <p className="font-display italic text-brand-light text-lg sm:text-xl mb-4 animate-fade-in">
          Unique water-based stays worldwide
        </p>
        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-medium leading-[1.1] tracking-tight max-w-3xl animate-fade-up">
          Stay on the water,<br />
          <em className="italic">wake to adventure.</em>
        </h1>
        <p className="mt-6 max-w-xl text-base sm:text-lg text-white/80 font-light leading-relaxed [animation-delay:0.15s] animate-fade-up">
          Discover cabins, yachts, and houseboats around the world.
          From harbor hideaways to open-sea escapes.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 [animation-delay:0.3s] animate-fade-up">
          {ctas ?? (
            <>
              <a href="#explore" className="btn btn-primary no-underline" aria-label="Explore listings">Explore Listings</a>
              <Link to="/host" className="btn btn-secondary no-underline" aria-label="Become a host">Become a Host</Link>
            </>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="relative bg-white/10 backdrop-blur-sm border-t border-white/10 [animation-delay:0.45s] animate-fade-up">
        <div className="container-p py-4 flex items-center gap-6 overflow-x-auto text-white">
          <div className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
            <span className="font-display text-2xl font-medium">200+</span>
            <span className="text-sm text-white/70">Unique Stays</span>
          </div>
          <div className="w-px h-5 bg-white/20 flex-shrink-0" />
          <div className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
            <span className="font-display text-2xl font-medium">40+</span>
            <span className="text-sm text-white/70">Countries</span>
          </div>
          <div className="w-px h-5 bg-white/20 flex-shrink-0" />
          <div className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
            <span className="font-display text-2xl font-medium">4.9★</span>
            <span className="text-sm text-white/70">Avg. Rating</span>
          </div>
          <div className="w-px h-5 bg-white/20 flex-shrink-0" />
          <div className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
            <span className="font-display text-2xl font-medium">10k+</span>
            <span className="text-sm text-white/70">Happy Guests</span>
          </div>
        </div>
      </div>
    </section>
  )
}
