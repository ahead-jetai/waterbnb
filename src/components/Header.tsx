import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'
import { useUserMode } from '../hooks/useUserMode'

const navLinkClass =
  'relative text-slate-600 hover:text-brand transition-colors duration-200 py-0.5 no-underline ' +
  'after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-brand ' +
  'after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-200'

/** Airbnb-style mode toggle: flips traveling <-> hosting and navigates to that mode's home. */
function ModeSwitchButton({ className = '', onSwitched }: { className?: string; onSwitched?: () => void }) {
  const { mode, setMode } = useUserMode()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const next = mode === 'hosting' ? 'traveling' : 'hosting'

  const handleClick = async () => {
    setBusy(true)
    try {
      await setMode(next)
      navigate(next === 'hosting' ? '/hosting' : '/')
      onSwitched?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={`text-sm font-medium text-slate-600 hover:text-brand transition-colors bg-transparent border border-slate-200 rounded-full px-4 py-1.5 cursor-pointer disabled:opacity-50 ${className}`}
    >
      {next === 'hosting' ? 'Switch to hosting' : 'Switch to traveling'}
    </button>
  )
}

export default function Header() {
  const [open, setOpen] = useState(false)
  const { mode } = useUserMode()
  const closeMenu = () => setOpen(false)

  const travelerLinks = [
    { to: '/', label: 'Explore' },
    { to: '/trips', label: 'My Trips' },
  ]
  const hostLinks = [
    { to: '/hosting', label: 'Dashboard' },
    { to: '/host/list', label: 'Create listing' },
  ]
  const links = mode === 'hosting' ? hostLinks : travelerLinks

  return (
    <header className="bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50 ring-1 ring-black/5">
      <div className="container-p flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 no-underline" aria-label="WaterBnB home">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 14c.83.64 2.58 2 4.5 2s3.67-1.36 4.5-2c.83-.64 2.58-2 4.5-2s3.67 1.36 4.5 2" />
              <path d="M3 9c.83.64 2.58 2 4.5 2s3.67-1.36 4.5-2c.83-.64 2.58-2 4.5-2s3.67 1.36 4.5 2" />
            </svg>
          </span>
          <span className="font-display font-semibold text-xl tracking-tight text-muted">WaterBnB</span>
          {mode === 'hosting' && (
            <SignedIn>
              <span className="ml-1 rounded-full bg-brand/10 text-brand text-xs font-medium px-2.5 py-0.5">
                Hosting
              </span>
            </SignedIn>
          )}
        </Link>

        {/* Desktop nav — only for signed-in users; the app is members-only */}
        <SignedIn>
          <nav aria-label="Primary" className="hidden md:flex items-center gap-8">
            {links.map(({ to, label }) => (
              <NavLink key={to} to={to} className={navLinkClass}>
                {label}
              </NavLink>
            ))}
          </nav>
        </SignedIn>

        <div className="hidden md:flex items-center gap-3">
          <SignedOut>
            <Link to="/sign-in" className="btn btn-secondary no-underline" aria-label="Sign in">
              Sign in
            </Link>
            <Link to="/sign-up" className="btn btn-primary no-underline" aria-label="Get started">
              Get started
            </Link>
          </SignedOut>
          <SignedIn>
            <ModeSwitchButton />
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>

        <button
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-muted hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Toggle menu</span>
          {open ? (
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-black/5 animate-fade-in">
          <div className="container-p py-4 flex flex-col gap-3">
            <SignedOut>
              <Link className="btn btn-primary w-full no-underline" to="/sign-up" onClick={closeMenu}>
                Get started
              </Link>
              <Link className="btn btn-secondary w-full no-underline" to="/sign-in" onClick={closeMenu}>
                Sign in
              </Link>
            </SignedOut>
            <SignedIn>
              {links.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className="py-1.5 text-slate-700 hover:text-brand no-underline"
                  onClick={closeMenu}
                >
                  {label}
                </NavLink>
              ))}
              <ModeSwitchButton className="w-full mt-1" onSwitched={closeMenu} />
              <div className="flex items-center gap-3 mt-2">
                <UserButton afterSignOutUrl="/" />
                <span className="text-sm text-slate-600">My account</span>
              </div>
            </SignedIn>
          </div>
        </div>
      )}
    </header>
  )
}
