import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SupportLink, supportEmail } from '../components/SupportLink'

function InfoLayout({ title, draft, children }: { title: string; draft?: boolean; children: ReactNode }) {
  return (
    <main className="container-p py-12 max-w-3xl w-full mx-auto space-y-5 text-slate-700">
      <h1 className="font-display text-4xl font-semibold text-muted">{title}</h1>
      {draft && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Pilot draft — pending operator and legal review before paid stays.</p>}
      {children}
    </main>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold text-muted">{title}</h2>
      {children}
    </section>
  )
}

export function TermsPage() {
  return (
    <InfoLayout title="Terms of Use" draft>
      <p>WaterBnB is operated by Arthur Head. The Los Angeles, California pilot is invitation-only and is limited to overnight stays on boats that remain moored. A booking does not include permission to operate the boat, a charter, or transportation.</p>
      <Section title="Accounts and bookings">
        <p>Use accurate account and booking details, and keep access to your account private. Only the guests named or permitted under the booking and within the listed capacity may stay. An inquiry or a host's approval is not a confirmed reservation; check My Trips for payment and confirmation status.</p>
      </Section>
      <Section title="Prices, refunds, and changes">
        <p>Review the total, including applicable displayed fees, before confirming in Stripe Checkout. Pay only through WaterBnB's Checkout. The <Link to="/cancellation">cancellation and refund policy</Link> explains the cutoff and how to ask for help.</p>
      </Section>
      <Section title="Host and guest responsibilities">
        <p>Hosts must have permission to offer overnight stays at their exact berth, carry coverage appropriate to the activity, accurately describe the boat and access, and provide safety and emergency instructions. Guests must follow the listing, marina rules, and <Link to="/safety">pilot safety guidance</Link>. Contact support if a stay cannot be provided safely or as described.</p>
      </Section>
      <p>Questions or a booking problem? <SupportLink />.</p>
    </InfoLayout>
  )
}

export function PrivacyPage() {
  return (
    <InfoLayout title="Privacy Notice" draft>
      <p>Arthur Head operates WaterBnB and is the contact for privacy questions about the Los Angeles pilot.</p>
      <Section title="Information used to operate WaterBnB">
        <p>We use account identifiers and contact and profile information; listing details and photos; reservation dates, party size, contact details and requests; messages and support correspondence; and payment status and transaction identifiers. We use this information to sign you in, run the marketplace, fulfill or refund bookings, respond to messages, and troubleshoot service or safety issues.</p>
      </Section>
      <Section title="What other parties can see">
        <p>Published listings and public host profiles are visible to visitors. The host and guest involved in a reservation can see the relevant booking and contact information. Clerk provides sign-in, Supabase stores app data and images, and Stripe handles Checkout, payment and host payouts. Card fields are entered on Stripe Checkout, not on WaterBnB. Externally hosted images may send standard connection details to their image provider.</p>
      </Section>
      <Section title="Retention and requests">
        <p>Contact us to ask about access, correction, or deletion. Some records may need to be retained for an active reservation, a legal requirement, or payment and dispute resolution. We may need to confirm you control the account before responding. Do not send passwords, verification codes, card numbers, or identity documents by email.</p>
        <p><SupportLink topic="privacy">Contact us about privacy</SupportLink>.</p>
      </Section>
    </InfoLayout>
  )
}

export function CancellationPage() {
  return (
    <InfoLayout title="Cancellation and refunds">
      <Section title="At least 48 hours before check-in">
        <p>Cancel an eligible confirmed stay from <Link to="/trips">My Trips</Link> for a full refund, including fees. The cutoff is 48 hours before the listing's local check-in time. Look for your exact cutoff in Checkout or My Trips.</p>
      </Section>
      <Section title="Less than 48 hours before check-in">
        <p><SupportLink topic="cancellation" /> for a late cancellation, a host cancellation, an unsafe stay, a missing cutoff, or a booking you cannot cancel online. An automatic refund is not promised for these cases. Contact us promptly with the booking reference and what happened.</p>
      </Section>
      <Section title="After requesting a refund">
        <p>Your reservation stays active until the refund succeeds. Check My Trips for the current status. If the refund fails, contact support. Your bank or payment provider determines when the returned funds appear.</p>
      </Section>
    </InfoLayout>
  )
}

export function SafetyPage() {
  return (
    <InfoLayout title="Safe stays on the water">
      <p>The Los Angeles pilot covers moored overnight stays only. Do not operate, move, or untie the boat. Follow the host's berth-access instructions, the marina's rules, and posted weather or harbor closures.</p>
      <Section title="Before boarding">
        <p>Ask the host how to board safely, what access or mobility limitations apply, where to find safety equipment and exits, and what to do if power, weather, or dock access changes. Know the marina address and berth. Supervise children around docks and water.</p>
      </Section>
      <Section title="If something is unsafe">
        <p>In the United States, call <a href="tel:911">911</a> for immediate danger. Do not wait for an email response. If a stay is unsafe or inaccessible, get to a safe place, notify the host or marina, and <SupportLink topic="safety" /> after the immediate danger has passed.</p>
      </Section>
    </InfoLayout>
  )
}

const subjects = {
  cancellation: 'WaterBnB booking or refund',
  invite: 'WaterBnB Los Angeles pilot invitation',
  privacy: 'WaterBnB privacy request',
  safety: 'WaterBnB safety report',
} as const

export function SupportPage() {
  const [params] = useSearchParams()
  const topic = params.get('topic')
  const subject = topic === 'cancellation' || topic === 'invite' || topic === 'privacy' || topic === 'safety'
    ? subjects[topic] : 'WaterBnB support'
  const candidate = params.get('reference') ?? ''
  const reference = /^[A-Za-z0-9-]{4,40}$/.test(candidate) ? candidate : ''
  const body = reference ? `Booking reference: ${reference}\n\n` : ''
  const email = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  return (
    <InfoLayout title="WaterBnB Support">
      <p>For booking changes, pilot invitations, privacy requests, or safety reports, email <a href={email}>{supportEmail}</a>.</p>
      {reference && <p>Booking reference: <strong>{reference}</strong></p>}
      {topic === 'invite'
        ? <p>Tell us whether you want to host or stay in the Los Angeles pilot. Asking for an invitation does not create a booking or guarantee access.</p>
        : <p>For booking help, include your booking reference and a brief description. Do not email payment card numbers, sign-in codes, or identity documents.</p>}
      <a className="btn btn-primary no-underline" href={email}>Email support</a>
      <p>For immediate danger in the United States, call <a href="tel:911">911</a>. Email is not an emergency service.</p>
    </InfoLayout>
  )
}
