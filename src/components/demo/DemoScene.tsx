import type { ReactNode } from 'react'
import { demoGuest, demoHost, demoListing, demoPayment, type DemoStep } from '../../data/demo'
import PriceSummary from '../booking/PriceSummary'
import { formatCurrency } from '../../utils/booking'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block text-sm font-medium text-slate-600">
      {label}
      <input className="input mt-1.5 bg-slate-50" value={value} readOnly tabIndex={-1} />
    </label>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-dark">{children}</span>
}

function ListingPhoto({ compact = false }: { compact?: boolean }) {
  return (
    <img src={demoListing.image} alt="A houseboat on calm water" className={`w-full rounded-xl object-cover ${compact ? 'h-36' : 'h-52 sm:h-64'}`} />
  )
}

function StayDetails() {
  return (
    <dl className="grid grid-cols-2 gap-4 rounded-xl bg-background p-4 text-sm">
      <div><dt className="text-slate-500">Dates</dt><dd className="mt-1 font-semibold">{demoListing.dates} · {demoListing.nights} nights</dd></div>
      <div><dt className="text-slate-500">Guests</dt><dd className="mt-1 font-semibold">{demoListing.guests} adults</dd></div>
    </dl>
  )
}

function GuestPrice() {
  return <PriceSummary lineItems={[
    { label: `${formatCurrency(demoListing.pricePerNight)} × ${demoListing.nights} nights`, amount: demoPayment.subtotal },
    { label: 'WaterBnB service fee (12%)', amount: demoPayment.serviceFee },
  ]} total={demoPayment.total} />
}

function SceneContent({ id }: { id: DemoStep['id'] }) {
  switch (id) {
    case 'sign-in':
    case 'guest-sign-in':
      return (
        <div className="mx-auto max-w-sm space-y-5 py-4">
          <h3 className="font-display text-3xl text-muted">Welcome to WaterBnB</h3>
          <p className="text-sm text-slate-500">Sign in to find your next adventure.</p>
          <Field label="Phone number" value={id === 'sign-in' ? demoHost.phone : demoGuest.phone} />
          <Field label="Demo verification code" value="123456" />
          <p className="text-xs text-slate-500">Fictional code · no SMS is sent</p>
        </div>
      )
    case 'host':
      return (
        <div className="mx-auto max-w-md space-y-5">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-xl font-semibold text-brand">{demoHost.initials}</span>
            <div><h3 className="text-lg font-semibold">{demoHost.name}</h3><p className="text-sm text-slate-500">WaterBnB member · Traveling mode</p></div>
          </div>
          <Field label="About you" value="I love sunset sails and sharing life on the water." />
          <div className="rounded-xl bg-background p-5">
            <h4 className="font-semibold">Your boat. Their adventure.</h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Create a spot, welcome guests, and manage your earnings from your hosting dashboard.</p>
          </div>
        </div>
      )
    case 'payouts':
      return (
        <div className="mx-auto max-w-md space-y-5">
          <h3 className="text-xl font-semibold">Connect your payout account</h3>
          <p className="text-sm text-slate-500">Demo Stripe onboarding</p>
          <Field label="Account holder" value={demoHost.name} />
          <Field label="Demo bank account" value="Demo Bank ···· 6789" />
          <div className="flex flex-wrap gap-2"><Badge>Identity verified</Badge><Badge>Payouts ready</Badge></div>
          <p className="text-sm text-slate-500">All details are fictional. This screen simulates completed onboarding.</p>
        </div>
      )
    case 'listing':
      return (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-4"><ListingPhoto /><p className="text-sm text-slate-500">Photo selected from our sample stays.</p></div>
          <div className="space-y-4">
            <Field label="Listing title" value={demoListing.title} />
            <Field label="Location" value={demoListing.location} />
            <div className="grid grid-cols-2 gap-3"><Field label="Nightly price" value={formatCurrency(demoListing.pricePerNight)} /><Field label="Max guests" value={String(demoListing.guests)} /></div>
            <Field label="Booking mode" value="Host review · pay after approval" />
            <p className="text-xs text-slate-500">Wi-Fi · Private deck · Kitchen · Sunset views</p>
          </div>
        </div>
      )
    case 'published':
      return (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold">Welcome back, {demoHost.firstName}</h3><Badge>Listing published</Badge></div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[['Active listings', '1'], ['Reservations', '0'], ['Earnings', '$0.00']].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-background p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-muted">{value}</p></div>
            ))}
          </div>
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center">
            <img src={demoListing.image} alt="Blue Haven Houseboat" className="h-32 w-full rounded-lg object-cover sm:w-40" />
            <div><h4 className="font-semibold">{demoListing.title}</h4><p className="mt-1 text-sm text-slate-500">{demoListing.location}</p><p className="mt-3 font-medium text-brand">{formatCurrency(demoListing.pricePerNight)} / night</p></div>
          </div>
        </div>
      )
    case 'guest':
      return (
        <div className="grid gap-6 sm:grid-cols-2">
          <ListingPhoto />
          <div className="space-y-4">
            <Badge>Signed in as {demoGuest.firstName}</Badge>
            <h3 className="font-display text-3xl text-muted">{demoListing.title}</h3>
            <p className="text-sm text-slate-500">{demoListing.location} · Hosted by {demoHost.firstName}</p>
            <p className="text-sm leading-relaxed text-slate-600">{demoListing.description}</p>
            <p className="text-xl font-semibold">{formatCurrency(demoListing.pricePerNight)} <span className="text-sm font-normal text-slate-500">/ night</span></p>
            <StayDetails />
          </div>
        </div>
      )
    case 'request':
      return (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-4"><h3 className="text-xl font-semibold">Request your stay</h3><StayDetails /><Field label="Guest name" value={demoGuest.name} /><Field label="Note to your host" value="We’d love a quiet weekend on the bay!" /></div>
          <div className="space-y-5 rounded-xl border border-slate-200 p-5"><ListingPhoto compact /><GuestPrice /><p className="text-sm text-brand">No payment yet. Your host will review this request first.</p></div>
        </div>
      )
    case 'approval':
      return (
        <div className="mx-auto max-w-lg space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold">A new booking request</h3><Badge>Awaiting host approval</Badge></div>
          <div className="rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 font-semibold text-accent-dark">{demoGuest.initials}</span><div><p className="font-semibold">{demoGuest.name}</p><p className="text-sm text-slate-500">{demoListing.title}</p></div></div>
            <StayDetails />
            <p className="rounded-lg bg-background p-4 text-sm italic text-slate-600">“We’d love a quiet weekend on the bay!”</p>
            <p className="text-sm text-slate-500">Approving lets Alex pay and confirms your availability.</p>
          </div>
        </div>
      )
    case 'checkout':
      return (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-5"><Badge>Request approved</Badge><h3 className="font-display text-3xl text-muted">Your stay is one step away</h3><p className="text-sm text-slate-500">{demoHost.firstName} approved your request. Complete payment to confirm.</p><Field label="Fictional saved payment method" value="Demo card ···· 4242" /><p className="text-xs text-slate-500">This simulates hosted checkout. No card details are collected or charged.</p></div>
          <div className="space-y-5 rounded-xl border border-slate-200 p-5"><h4 className="font-semibold">{demoListing.title}</h4><StayDetails /><GuestPrice /></div>
        </div>
      )
    case 'confirmation':
      return (
        <div className="mx-auto max-w-lg space-y-5">
          <Badge>Payment successful · Reservation confirmed</Badge>
          <h3 className="font-display text-3xl text-muted">You’re going to {demoListing.location}!</h3>
          <ListingPhoto compact />
          <h4 className="font-semibold">{demoListing.title}</h4>
          <StayDetails />
          <dl className="flex flex-wrap justify-between gap-4 text-sm"><div><dt className="text-slate-500">Booking reference</dt><dd className="mt-1 font-mono">{demoPayment.reference}</dd></div><div><dt className="text-slate-500">Demo payment</dt><dd className="mt-1 font-semibold">{formatCurrency(demoPayment.total)}</dd></div></dl>
        </div>
      )
    case 'earnings':
      return (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold">Your first booking payment</h3><Badge>Demo payout received</Badge></div>
          <div className="rounded-xl bg-muted p-6 text-white"><p className="text-sm text-white/70">Paid to Demo Bank ···· 6789</p><p className="mt-2 font-display text-5xl">{formatCurrency(demoPayment.hostNet)}</p><p className="mt-3 text-xs text-white/60">Simulated after processing and payout settlement.</p></div>
          <PriceSummary lineItems={[
            { label: 'Guest payment', amount: demoPayment.total },
            { label: 'WaterBnB service fee (12% of nightly subtotal)', amount: -demoPayment.serviceFee },
            { label: 'Estimated processing fee (2.9% + $0.30)', amount: -demoPayment.processingFee },
          ]} total={demoPayment.hostNet} totalLabel="Host earnings" footer="Processing fees and payout timing are illustrative. Actual amounts depend on payment method and account settings." />
          <div className="rounded-xl border border-slate-200 p-4 text-sm"><p className="font-semibold">{demoGuest.name} · {demoListing.title}</p><p className="mt-1 text-slate-500">{demoListing.dates} · {demoPayment.reference}</p></div>
        </div>
      )
  }
}

export default function DemoScene({ step, onAdvance, complete }: { step: DemoStep; onAdvance: () => void; complete: boolean }) {
  const person = step.actor === 'host' ? demoHost : demoGuest
  return (
    <section aria-label="Demo app preview" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
        <div><span className="font-display text-xl font-semibold text-muted">WaterBnB</span><span className="ml-3 text-xs text-slate-500">{step.area}</span></div>
        <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-600"><span className={`flex h-7 w-7 items-center justify-center rounded-full ${step.actor === 'host' ? 'bg-brand/10 text-brand' : 'bg-accent/10 text-accent-dark'}`}>{person.initials}</span>{person.name} · {step.actor === 'host' ? 'Host' : 'Guest'}</span>
      </div>
      <div key={step.id} className="p-5 sm:p-8 motion-safe:animate-fade-in">
        <SceneContent id={step.id} />
        {!complete && <div className="mt-6 flex justify-end"><button onClick={onAdvance} className="btn btn-primary">{step.action} <span aria-hidden="true" className="ml-2">→</span></button></div>}
      </div>
    </section>
  )
}
