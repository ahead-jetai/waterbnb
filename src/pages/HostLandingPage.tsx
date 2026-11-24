import { Link } from 'react-router-dom'
import { SupportLink } from '../components/SupportLink'

export default function HostLandingPage() {
  return (
    <main>
      <section className="bg-muted text-white">
        <div className="container-p py-20 lg:py-28 max-w-4xl">
          <p className="text-brand-light">Los Angeles, California · invitation-only</p>
          <h1 className="font-display text-4xl sm:text-6xl mt-3 font-medium">Host a moored overnight stay</h1>
          <p className="mt-5 text-white/80 max-w-xl">
            The pilot is for stationary stays on boats with the right marina permissions, insurance, and guest safety arrangements.
            It does not include charters, transportation, or guest operation of the boat.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/host/list" className="btn btn-primary no-underline">Create a listing draft</Link>
            <SupportLink topic="invite" className="btn btn-secondary no-underline">Ask about hosting</SupportLink>
          </div>
        </div>
      </section>
      <section className="container-p py-12 max-w-4xl">
        <h2 className="font-display text-3xl text-muted font-medium mb-6">Before a listing can go live</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          <li className="card p-5"><strong>1. Create a draft</strong><p className="mt-2 text-sm text-slate-600">Describe the exact berth, access limitations, capacity, and the overnight stay. Add current photos.</p></li>
          <li className="card p-5"><strong>2. Complete review</strong><p className="mt-2 text-sm text-slate-600">WaterBnB reviews berth permission, local requirements, insurance, and safety arrangements before publishing.</p></li>
          <li className="card p-5"><strong>3. Prepare for guests</strong><p className="mt-2 text-sm text-slate-600">Set up Stripe payouts and provide clear check-in, boarding, and emergency instructions.</p></li>
        </ol>
        <p className="mt-6">Read the <Link to="/safety">guest safety guidance</Link> and <Link to="/cancellation">cancellation policy</Link>.</p>
      </section>
    </main>
  )
}
