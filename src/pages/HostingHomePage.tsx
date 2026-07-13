import { Link, Navigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useUserMode } from '../hooks/useUserMode'

/** Hosting-mode home: the host's dashboard. */
export default function HostingHomePage() {
  const { user } = useUser()
  const { mode, isLoaded } = useUserMode()
  const firstName = user?.firstName

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
          <p className="font-display text-3xl font-medium text-muted mt-1">0</p>
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
      </section>
    </main>
  )
}
