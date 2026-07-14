import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { Booking, Listing } from '../bookingTypes'
import { fetchListing } from '../utils/listingsApi'
import { fetchCheckoutSession } from '../utils/paymentsApi'
import { createBooking, fetchBookingByReference } from '../utils/bookingsApi'
import { calculateNights, formatDateLong, pluralize } from '../utils/booking'
import { ListingSummaryCard, InfoRow, PriceSummary } from '../components/booking'
import CheckCircleIcon from '../components/icons/CheckCircleIcon'

const NEXT_STEPS = [
  'Check your email for your Stripe payment receipt',
  'Your host will contact you within 24 hours with check-in instructions',
  'Save your booking reference number for future correspondence',
  'Contact support if you need to make any changes to your reservation'
] as const

export default function BookingConfirmationPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [listing, setListing] = useState<Listing | null>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!listingId) return
    let cancelled = false
    fetchListing(listingId).then(l => { if (!cancelled) setListing(l) })
    return () => { cancelled = true }
  }, [listingId])

  // Verify the Stripe Checkout session, then persist the booking exactly once
  // (page reloads find the existing booking by its payment reference).
  useEffect(() => {
    if (!sessionId) {
      setError('Missing payment session. If you completed a payment, check My Trips.')
      setLoading(false)
      return
    }
    let cancelled = false

    async function confirm(id: string) {
      try {
        const session = await fetchCheckoutSession(id)
        if (!session.paid) {
          throw new Error('This payment has not been completed. You have not been charged.')
        }

        const existing = await fetchBookingByReference(session.reference)
        if (existing) {
          if (!cancelled) setBooking(existing)
          return
        }

        const m = session.metadata
        const saved = await createBooking({
          listingId: m.listing_id,
          guestId: m.guest_id,
          checkIn: m.check_in,
          checkOut: m.check_out,
          guests: Number(m.guests),
          guestDetails: {
            name: m.guest_name,
            email: m.guest_email,
            phone: m.guest_phone,
            specialRequests: m.special_requests || undefined,
          },
          subtotal: Number(m.subtotal_cents) / 100,
          serviceFee: Number(m.service_fee_cents) / 100,
          total: session.amountTotal / 100,
          bookingReference: session.reference,
        })
        if (!cancelled) setBooking(saved)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not confirm your booking.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    confirm(sessionId)
    return () => { cancelled = true }
  }, [sessionId])

  if (loading) {
    return (
      <div className="container-p py-16 flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Confirming your payment…</div>
      </div>
    )
  }

  if (error || !booking || !listing) {
    return (
      <div className="container-p py-16 text-center max-w-xl mx-auto">
        <h1 className="font-display text-3xl font-semibold mb-4">Something went wrong</h1>
        <p className="text-slate-500 mb-8" role="alert">{error || 'We could not load your booking.'}</p>
        <div className="flex gap-3 justify-center">
          <Link to="/trips" className="btn btn-primary no-underline">Check My Trips</Link>
          <Link to={`/listing/${listingId}`} className="btn btn-secondary no-underline">Back to listing</Link>
        </div>
      </div>
    )
  }

  const { guestDetails } = booking
  const nights = calculateNights(booking.checkIn, booking.checkOut)

  const priceLineItems = [
    { label: `$${listing.pricePerNight.toFixed(2)} × ${nights} ${pluralize(nights, 'night')}`, amount: booking.subtotal },
    { label: 'Service fee', amount: booking.serviceFee }
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container-p py-10 max-w-3xl">
        {/* Success Message */}
        <div className="text-center mb-8 animate-fade-up">
          <CheckCircleIcon className="mb-4" />
          <h1 className="font-display text-4xl font-medium text-muted mb-2">Booking confirmed!</h1>
          <p className="text-slate-500">
            Your payment was successful. We've sent a receipt to{' '}
            <span className="font-medium text-slate-700">{guestDetails.email}</span>
          </p>
        </div>

        {/* Booking Reference */}
        <div className="card p-6 mb-6 bg-brand/5 ring-brand/20">
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Booking Reference</p>
            <p className="font-display text-3xl font-semibold text-brand">{booking.bookingReference}</p>
          </div>
        </div>

        {/* Booking Details */}
        <div className="card p-6 mb-6">
          <h2 className="font-display text-xl font-medium text-muted mb-4">Your trip details</h2>

          <ListingSummaryCard listing={listing} className="mb-6" />

          <div className="grid md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
            <div>
              <h4 className="font-semibold text-sm text-slate-700 mb-3">Dates</h4>
              <div className="space-y-2">
                <InfoRow label="Check-in" value={formatDateLong(booking.checkIn)} />
                <InfoRow label="Check-out" value={formatDateLong(booking.checkOut)} />
                <InfoRow label="Duration" value={`${nights} ${pluralize(nights, 'night')}`} />
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-slate-700 mb-3">Guest information</h4>
              <div className="space-y-2">
                <InfoRow label="Guest name" value={guestDetails.name} />
                <InfoRow label="Email" value={guestDetails.email} />
                <InfoRow label="Phone" value={guestDetails.phone} />
                <InfoRow label="Number of guests" value={booking.guests} />
              </div>
            </div>
          </div>

          {guestDetails.specialRequests && (
            <div className="border-t border-slate-100 pt-6 mt-6">
              <h4 className="font-semibold text-sm text-slate-700 mb-2">Special requests</h4>
              <p className="text-slate-600 text-sm">{guestDetails.specialRequests}</p>
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div className="card p-6 mb-6">
          <h2 className="font-display text-xl font-medium text-muted mb-4">Payment summary</h2>
          <PriceSummary
            lineItems={priceLineItems}
            total={booking.total}
            totalLabel="Total paid"
            footer={<p>Paid securely via Stripe Checkout</p>}
          />
        </div>

        {/* Next Steps */}
        <div className="card p-6 mb-8 bg-brand/5 ring-brand/20">
          <h2 className="font-display text-xl font-medium text-muted mb-4">Next steps</h2>
          <ul className="space-y-3">
            {NEXT_STEPS.map((step, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-slate-600">
                <span className="inline-flex w-5 h-5 rounded-full bg-brand text-white text-xs font-semibold items-center justify-center flex-shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Link to="/trips" className="btn btn-primary no-underline">
            View My Trips
          </Link>
          <button
            onClick={() => window.print()}
            className="btn btn-secondary"
          >
            Print confirmation
          </button>
        </div>
      </div>
    </div>
  )
}
