import { useEffect, useRef, useState } from 'react'

type Slide = {
  src: string
  alt: string
}

type Props = {
  slides: Slide[]
  intervalMs?: number
}



export default function Carousel({ slides, intervalMs = 3500 }: Props) {
  const [index, setIndex] = useState(0)
  const timer = useRef<number | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [paused, setPaused] = useState(false)
  const count = slides.length

  // autoplay
  useEffect(() => {
    if (paused) return
    timer.current && window.clearInterval(timer.current)
    timer.current = window.setInterval(() => setIndex((i) => (i + 1) % count), intervalMs)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [count, intervalMs, paused])

  // basic swipe support
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    let startX = 0
    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
    }
    const onMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - startX
      if (Math.abs(dx) > 60) {
        if (dx > 0) prev()
        else next()
        startX = e.touches[0].clientX // prevent multiple triggers
      }
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
    }
  }, [])

  const next = () => setIndex((i) => (i + 1) % count)
  const prev = () => setIndex((i) => (i - 1 + count) % count)

  return (
    <section aria-label="Featured boats" className="container-p">
      <div
        ref={rootRef}
        className="relative card overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <ul className="relative h-64 sm:h-80 lg:h-96">
          {slides.map((s, i) => {
            // Only the visible slide and its neighbors get an <img>, so first
            // paint downloads at most three slides instead of the whole deck.
            const nearActive =
              i === index || i === (index + 1) % count || i === (index - 1 + count) % count
            return (
              <li
                key={i}
                className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}
                aria-hidden={i !== index}
              >
                {nearActive && (
                  <img
                    src={s.src}
                    alt={s.alt}
                    loading={i === index ? 'eager' : 'lazy'}
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                )}
              </li>
            )
          })}
        </ul>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-black/10" />

        <div className="absolute inset-y-0 left-0 flex items-center">
          <button
            className="pointer-events-auto m-3 md:m-4 rounded-full bg-white/90 p-2 text-muted shadow hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={prev}
            aria-label="Previous slide"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 4 6 10l6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center">
          <button
            className="pointer-events-auto m-3 md:m-4 rounded-full bg-white/90 p-2 text-muted shadow hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={next}
            aria-label="Next slide"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2.5 w-2.5 rounded-full border border-white/60 ${i === index ? 'bg-white' : 'bg-white/40'}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
