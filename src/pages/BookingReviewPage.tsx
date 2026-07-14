import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchListing } from '../utils/listingsApi'
import type { BookingData, Listing } from '../bookingTypes'
import { useEffect, useState } from 'react'
import { BookingProgress } from '../components/booking'

export default function BookingReviewPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [listing, setListing] = useState<Listing | null>(null)

  useEffect(() => {
    if (location.state && location.state.bookingData) {
      setBookingData(location.state.bookingData)
    } else {
      navigate(`/listing/${listingId}`)
    }
  }, [location.state, listingId, navigate])

  useEffect(() => {
    if (!listingId) return
    let cancelled = false
    fetchListing(listingId).then(l => { if (!cancelled) setListing(l) })
    return () => { cancelled = true }
  }, [listingId])

  if (!listing || !bookingData) {
    return null
  }

  const checkInDate = new Date(bookingData.dates.checkIn)
  const checkOutDate = new Date(bookingData.dates.checkOut)
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
  const subtotal = nights * listing.pricePerNight
  const serviceFee = subtotal * 0.12
  const total = subtotal + serviceFee

  const handleContinue = () => {
    navigate(`/booking/${listingId}/guest-details`, { state: { bookingData } })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container-p py-8 max-w-4xl">
        <button
          onClick={() => navigate(`/listing/${listingId}`)}
          className="text-brand hover:text-brand-dark mb-6 flex items-center gap-1.5 text-sm font-medium no-underline bg-transparent border-0 cursor-pointer p-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to listing
        </button>

        <div className="mb-8">
          <BookingProgress currentStep={1} />
          <h1 className="font-display text-3xl font-medium text-muted text-center">Review your booking</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Listing Info */}
          <div>
            <div className="card p-6 mb-6">
              <img
                src={listing.image}
                alt={listing.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <h2 className="font-semibold text-lg mb-1">{listing.title}</h2>
              <p className="text-slate-500 text-sm mb-3 flex items-center gap-1">
                <svg className="w-3 h-3 text-brand flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {listing.location}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-amber-500">★</span>
                <span className="font-semibold">{listing.rating}</span>
                <span className="text-slate-500">({listing.reviews} reviews)</span>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-semibold text-base mb-4">Your trip details</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Dates</div>
                  <div className="text-slate-800 font-medium">
                    {formatDate(checkInDate)} — {formatDate(checkOutDate)}
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">{nights} {nights === 1 ? 'night' : 'nights'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Guests</div>
                  <div className="text-slate-800 font-medium">
                    {bookingData.guests} {bookingData.guests === 1 ? 'guest' : 'guests'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Price Breakdown */}
          <div>
            <div className="card p-6 sticky top-8">
              <h3 className="font-semibold text-base mb-4">Price details</h3>
              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">${listing.pricePerNight.toFixed(2)} × {nights} {nights === 1 ? 'night' : 'nights'}</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Service fee</span>
                  <span className="font-medium">${serviceFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-100 pt-3 flex justify-between font-semibold">
                  <span>Total (USD)</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              <button onClick={handleContinue} className="btn btn-primary w-full">
                Continue to guest details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
