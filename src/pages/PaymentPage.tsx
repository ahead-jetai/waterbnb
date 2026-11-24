import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import type { Booking, BookingData, Listing } from '../bookingTypes'
import { fetchListing } from '../utils/listingsApi'
import { createBookingRequest, fetchCheckoutBooking, startApprovedRequestCheckout, startCheckout } from '../utils/paymentsApi'
import { calculateBookingTotals, calculateNights } from '../utils/booking'
import { BookingProgress } from '../components/booking'
import { bookingModeLabel, bookingModeSummary, isInstantBooking } from '../utils/bookingMode'
import { rowToBooking } from '../utils/bookingsApi'
import { SupportLink } from '../components/SupportLink'

export default function PaymentPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const approvedBookingId = searchParams.get('booking_id')
  const wasCancelled = Boolean(searchParams.get('cancelled'))
  const { user } = useUser()
  const { getToken } = useAuth()
  const [checkoutBooking, setCheckoutBooking] = useState<Booking | null>(null)
  const [listing, setListing] = useState<Listing | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(
    searchParams.get('cancelled') ? 'You left Checkout. Resume payment or check My Trips for your booking status.' : ''
  )
  const savedBooking = checkoutBooking?.id === approvedBookingId ? checkoutBooking : null
  const routedBooking = location.state?.bookingData as BookingData | undefined
  const bookingData = approvedBookingId ? savedBooking && {
    listingId: savedBooking.listingId,
    dates: { checkIn: savedBooking.checkIn, checkOut: savedBooking.checkOut },
    guests: savedBooking.guests,
    guestDetails: savedBooking.guestDetails,
  } : routedBooking?.guestDetails ? routedBooking : null

  useEffect(() => {
    if (!listingId) return
    let cancelled = false
    fetchListing(listingId, approvedBookingId ? getToken : undefined)
      .then(l => {
        if (cancelled) return
        setListing(l)
        if (!l) setError('This stay is not currently available.')
      })
      .catch(() => { if (!cancelled) setError('Could not load this listing. Please try again.') })
    return () => { cancelled = true }
  }, [approvedBookingId, getToken, listingId])

  useEffect(() => {
    if (approvedBookingId) return
    if (routedBooking && !routedBooking.guestDetails) {
      navigate(`/booking/${listingId}/guest-details`, { state: { bookingData: routedBooking } })
    } else if (!routedBooking && !wasCancelled) {
      navigate(`/listing/${listingId}`)
    }
  }, [approvedBookingId, routedBooking, listingId, navigate, wasCancelled])

  useEffect(() => {
    if (!approvedBookingId) return
    let cancelled = false
    fetchCheckoutBooking(getToken, approvedBookingId).then(row => {
      if (cancelled) return
      const booking = rowToBooking(row)
      if (booking.listingId !== listingId) {
        setError('This request is not ready for payment.')
        return
      }
      setCheckoutBooking(booking)
    }).catch(() => {
      if (!cancelled) setError('Could not load this booking request. Please try again.')
    })
    return () => { cancelled = true }
  }, [approvedBookingId, getToken, listingId])

  if (!bookingData || !listing) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container-p py-16 max-w-lg text-center">
          {error ? (
            <>
              <p className="text-sm text-danger mb-6" role="alert">{error}</p>
              <div className="flex justify-center gap-3">
                <Link to="/trips" className="btn btn-secondary no-underline">Back to trips</Link>
                {listingId && (
                  <Link to={`/listing/${listingId}`} className="btn btn-primary no-underline">Back to listing</Link>
                )}
              </div>
            </>
          ) : (
            <p className="text-slate-500">Loading…</p>
          )}
        </div>
      </div>
    )
  }

  const checkInDate = new Date(bookingData.dates.checkIn)
  const checkOutDate = new Date(bookingData.dates.checkOut)
  const nights = calculateNights(checkInDate, checkOutDate)
  const { subtotal, serviceFee, total } = savedBooking?.status === 'checkout_pending'
    ? savedBooking : calculateBookingTotals(listing.pricePerNight, nights)
  const nightly = nights > 0 ? subtotal / nights : listing.pricePerNight

  const handlePay = async () => {
    if (!listingId || !user || !bookingData.guestDetails) {
      setError('You must be signed in with guest details to complete a booking')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      if (approvedBookingId) {
        const url = await startApprovedRequestCheckout(getToken, approvedBookingId)
        window.location.assign(url)
        return
      }

      if (isInstantBooking(listing)) {
        // The edge function computes the real amounts server-side and returns a
        // Stripe-hosted Checkout URL; Stripe redirects back to our confirmation
        // page (with session_id) after payment.
        const url = await startCheckout(getToken, {
          listingId,
          checkIn: bookingData.dates.checkIn,
          checkOut: bookingData.dates.checkOut,
          guests: bookingData.guests,
          guestDetails: bookingData.guestDetails,
        })
        window.location.assign(url)
        return
      }

      await createBookingRequest(getToken, {
        listingId,
        checkIn: bookingData.dates.checkIn,
        checkOut: bookingData.dates.checkOut,
        guests: bookingData.guests,
        guestDetails: bookingData.guestDetails,
      })
      navigate('/trips')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete this request. Please try again.')
      setSubmitting(false)
    }
  }

  const handleBack = () => {
    navigate(`/booking/${listingId}/guest-details`, { state: { bookingData } })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container-p py-8 max-w-4xl">
        <button
          onClick={handleBack}
          className="text-brand hover:text-brand-dark mb-6 flex items-center gap-1.5 text-sm font-medium bg-transparent border-0 cursor-pointer p-0 no-underline"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="mb-8">
          <BookingProgress currentStep={3} />
          <h1 className="font-display text-3xl font-medium text-muted text-center">
            {approvedBookingId || isInstantBooking(listing) ? 'Payment' : 'Submit request'}
          </h1>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Pay with Stripe */}
          <div>
            <div className="card p-6">
              <h3 className="font-semibold text-base mb-2">
                {approvedBookingId || isInstantBooking(listing) ? 'Secure checkout' : 'Request to book'}
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                {approvedBookingId || isInstantBooking(listing)
                  ? "You'll be redirected to Stripe's secure payment page to complete your booking. Your payment goes to the host, and WaterBnB keeps a 12% service fee."
                  : 'Send your dates and guest details to the host. You will not be charged unless the host approves your request.'}
              </p>

              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm mb-6">
                <p className="font-medium text-slate-800">{bookingModeLabel(listing)}</p>
                <p className="text-slate-500 mt-0.5">{bookingModeSummary(listing)}</p>
              </div>

              {error && (
                <p className="text-sm text-danger mb-4" role="alert">{error}</p>
              )}

              <button onClick={handlePay} disabled={submitting} className="btn btn-primary w-full">
                {submitting
                  ? approvedBookingId || isInstantBooking(listing) ? 'Redirecting to Stripe…' : 'Submitting request…'
                  : approvedBookingId || isInstantBooking(listing) ? `Pay with Stripe — $${total.toFixed(2)}` : 'Submit booking request'}
              </button>

              <p className="text-xs text-slate-400 text-center mt-4">
                {approvedBookingId || isInstantBooking(listing)
                  ? "Payments are processed by Stripe. You won't be charged until you confirm on the next page."
                  : 'No payment method is collected for host-review requests.'}
              </p>
              {(approvedBookingId || isInstantBooking(listing)) && (
                <p className="text-xs text-slate-600 text-center mt-2">
                  Cancel at least 48 hours before local check-in for a full refund, including fees.
                  {' '}Read the <Link to="/cancellation">cancellation policy</Link> or <SupportLink topic="cancellation" />.
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Booking Summary */}
          <div>
            <div className="card p-6 sticky top-8">
              <h3 className="font-semibold text-base mb-4">Booking summary</h3>

              <div className="mb-4">
                <img
                  src={listing.image}
                  alt={listing.title}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
                <h4 className="font-semibold text-sm">{listing.title}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{listing.location}</p>
                <p className="text-xs text-slate-500 mt-2">
                  <span className="font-medium text-slate-700">{bookingModeLabel(listing)}:</span> {bookingModeSummary(listing)}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2 mb-4 text-sm">
                <div>
                  <span className="text-slate-500">Check-in: </span>
                  <span className="font-medium">
                    {checkInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Check-out: </span>
                  <span className="font-medium">
                    {checkOutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Guests: </span>
                  <span className="font-medium">{bookingData.guests}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">${nightly.toFixed(2)} × {nights} nights</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Service fee</span>
                  <span>${serviceFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-100 pt-2 flex justify-between font-semibold">
                  <span>Total (USD)</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
