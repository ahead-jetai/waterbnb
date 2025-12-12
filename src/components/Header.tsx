import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Header() {
  const [open, setOpen] = useState(false)
  return (
    <header className="bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50 ring-1 ring-black/5">
      <div className="container-p flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2" aria-label="WaterBnB home">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white font-bold">W</span>
          <span className="font-semibold text-lg tracking-tight text-muted">WaterBnB</span>
        </Link>
        <nav aria-label="Primary" className="hidden md:flex items-center gap-8">
          <a className="hover:text-brand" href="#explore">Explore</a>
          <a className="hover:text-brand" href="#host">Host a Boat</a>
          <a className="hover:text-brand" href="#about">About</a>
        </nav>
        <div className="hidden md:block">
          <a href="#get-started" className="btn btn-primary" aria-label="Get started">
            Get Started
          </a>
        </div>
        <button
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-muted hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Toggle menu</span>
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-black/5">
          <div className="container-p py-3 flex flex-col gap-3">
            <a className="py-1" href="#explore">Explore</a>
            <a className="py-1" href="#host">Host a Boat</a>
            <a className="py-1" href="#about">About</a>
            <a className="btn btn-primary w-full mt-2" href="#get-started">Get Started</a>
          </div>
        </div>
      )}
    </header>
  )
}
