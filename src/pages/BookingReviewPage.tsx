import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { listings } from '../data/listings'
import { BookingData } from '../types'
import { useEffect, useState } from 'react'

export default function BookingReviewPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [bookingData, setBookingData] = useState<BookingData | null>(null)

  const listing = listings.find(l => l.id === listingId)

  useEffect(() => {
    // Get booking data from navigation state
    if (location.state && location.state.bookingData) {
      setBookingData(location.state.bookingData)
    } else {
      // Redirect back to listing if no booking data
      navigate(`/listing/${listingId}`)
    }
  }, [location.state, listingId, navigate])

  if (!listing || !bookingData) {
    return null
  }

  const checkInDate = new Date(bookingData.dates.checkIn)
  const checkOutDate = new Date(bookingData.dates.checkOut)
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
  const subtotal = nights * listing.pricePerNight
  const serviceFee = subtotal * 0.12 // 12% service fee
  const total = subtotal + serviceFee

  const handleContinue = () => {
    navigate(`/booking/${listingId}/guest-details`, {
      state: { bookingData }
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/listing/${listingId}`)}
            className="text-sky-500 hover:text-sky-600 mb-4 flex items-center gap-2"
          >
            ← Back to listing
          </button>
          <h1 className="text-3xl font-bold mb-2">Review your booking</h1>
          <p className="text-gray-600">Step 1 of 3</p>
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
              <h2 className="text-xl font-semibold mb-2">{listing.title}</h2>
              <p className="text-gray-600 mb-2">{listing.location}</p>
              <div className="flex items-center gap-2">
                <span className="text-yellow-500">★</span>
                <span className="font-semibold">{listing.rating}</span>
                <span className="text-gray-600">({listing.reviews} reviews)</span>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Your trip details</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-semibold mb-1">Dates</div>
                  <div className="text-gray-700">
                    {formatDate(checkInDate)} - {formatDate(checkOutDate)}
                  </div>
                  <div className="text-sm text-gray-500">{nights} nights</div>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">Guests</div>
                  <div className="text-gray-700">
                    {bookingData.guests} {bookingData.guests === 1 ? 'guest' : 'guests'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Price Breakdown */}
          <div>
            <div className="card p-6 sticky top-8">
              <h3 className="text-lg font-semibold mb-4">Price details</h3>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-700">
                    ${listing.pricePerNight.toFixed(2)} × {nights} nights
                  </span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Service fee</span>
                  <span className="font-semibold">${serviceFee.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg font-bold">
                  <span>Total (USD)</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              <button
                onClick={handleContinue}
                className="btn btn-primary w-full"
              >
                Continue to guest details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
