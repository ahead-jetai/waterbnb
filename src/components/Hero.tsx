export default function Hero() {
  return (
    <section
      className="relative isolate"
      aria-label="Hero section"
    >
      <div className="absolute inset-0 -z-10">
        <img
          src="https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=1600&q=60"
          alt="Coastline with boats"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/20" />
      </div>
      <div className="container-p py-24 sm:py-28 lg:py-32 text-white">
        <h1 className="max-w-3xl text-4xl sm:text-5xl font-semibold tracking-tight">Stay on the water, wake to adventure.</h1>
        <p className="mt-4 max-w-2xl text-lg text-white/90">
          Discover cabins, yachts, and houseboats around the world. From harbor hideaways to open-sea escapes.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#explore" className="btn btn-primary" aria-label="Explore listings">Explore Listings</a>
          <a href="#host" className="btn btn-secondary" aria-label="Become a host">Become a Host</a>
        </div>
      </div>
    </section>
  )
}
