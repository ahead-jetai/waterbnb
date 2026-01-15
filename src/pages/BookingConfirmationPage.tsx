import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMemo, useLayoutEffect } from 'react'
import type { BookingData } from '../bookingTypes'
import { listings } from '../data/listings'
import { calculateNights, formatDateLong, pluralize } from '../utils/booking'
import { ListingSummaryCard, InfoRow, PriceSummary } from '../components/booking'
import CheckCircleIcon from '../components/icons/CheckCircleIcon'

type ConfirmationState = {
  bookingData: BookingData
  bookingReference: string
  total: number
}

const NEXT_STEPS = [
  'Check your email for booking confirmation and additional details',
  'Your host will contact you within 24 hours with check-in instructions',
  'Save your booking reference number for future correspondence',
  'Contact support if you need to make any changes to your reservation'
] as const

function parseConfirmationState(state: unknown): ConfirmationState | null {
  if (!state || typeof state !== 'object') return null

  const { bookingData, bookingReference, total } = state as Record<string, unknown>

  if (!bookingData || typeof bookingData !== 'object') return null

  const booking = bookingData as BookingData
  if (!booking.guestDetails || !booking.paymentDetails) return null

  return {
    bookingData: booking,
    bookingReference: String(bookingReference ?? ''),
    total: Number(total ?? 0)
  }
}

export default function BookingConfirmationPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const location = useLocation()
  const navigate = useNavigate()

  const listing = listings.find(l => l.id === listingId)

  const confirmationState = useMemo(
    () => parseConfirmationState(location.state),
    [location.state]
  )

  // Redirect if state is invalid - use useLayoutEffect to redirect before paint
  useLayoutEffect(() => {
    if (!confirmationState) {
      navigate(`/listing/${listingId}`, { replace: true })
    }
  }, [confirmationState, listingId, navigate])

  if (!confirmationState || !listing) {
    return null
  }

  const { bookingData, bookingReference, total } = confirmationState
  const { guestDetails, paymentDetails, dates, guests } = bookingData

  const nights = calculateNights(dates.checkIn, dates.checkOut)
  const nightlyTotal = nights * listing.pricePerNight
  const serviceFee = total - nightlyTotal

  const priceLineItems = [
    { label: `$${listing.pricePerNight.toFixed(2)} × ${nights} ${pluralize(nights, 'night')}`, amount: nightlyTotal },
    { label: 'Service fee', amount: serviceFee }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Success Message */}
        <div className="text-center mb-8">
          <CheckCircleIcon className="mb-4" />
          <h1 className="text-3xl font-bold mb-2">Booking confirmed!</h1>
          <p className="text-gray-600">
            Your reservation has been successfully confirmed. We've sent a confirmation email to{' '}
            <span className="font-semibold">{guestDetails?.email}</span>
          </p>
        </div>

        {/* Booking Reference */}
        <div className="card p-6 mb-6 bg-sky-50 border-2 border-sky-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Booking Reference</p>
            <p className="text-2xl font-bold text-sky-600">{bookingReference}</p>
          </div>
        </div>

        {/* Booking Details */}
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Your trip details</h2>

          <ListingSummaryCard listing={listing} className="mb-6" />

          <div className="grid md:grid-cols-2 gap-6 border-t pt-6">
            <div>
              <h4 className="font-semibold mb-3">Dates</h4>
              <div className="space-y-2">
                <InfoRow label="Check-in" value={formatDateLong(dates.checkIn)} />
                <InfoRow label="Check-out" value={formatDateLong(dates.checkOut)} />
                <InfoRow label="Duration" value={`${nights} ${pluralize(nights, 'night')}`} />
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Guest information</h4>
              <div className="space-y-2">
                <InfoRow label="Guest name" value={guestDetails?.name} />
                <InfoRow label="Email" value={guestDetails?.email} />
                <InfoRow label="Phone" value={guestDetails?.phone} />
                <InfoRow label="Number of guests" value={guests} />
              </div>
            </div>
          </div>

          {guestDetails?.specialRequests && (
            <div className="border-t pt-6 mt-6">
              <h4 className="font-semibold mb-2">Special requests</h4>
              <p className="text-gray-700">{guestDetails.specialRequests}</p>
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Payment summary</h2>
          <PriceSummary
            lineItems={priceLineItems}
            total={total}
            totalLabel="Total paid"
            footer={<p>Paid with card ending in {paymentDetails?.cardNumber.slice(-4)}</p>}
          />
        </div>

        {/* Next Steps */}
        <div className="card p-6 mb-6 bg-blue-50 border-2 border-blue-200">
          <h2 className="text-xl font-bold mb-3">Next steps</h2>
          <ul className="space-y-2 text-gray-700">
            {NEXT_STEPS.map((step, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary"
          >
            Back to home
          </button>
          <button
            onClick={() => window.print()}
            className="btn bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Print confirmation
          </button>
        </div>
      </div>
    </div>
  )
}
