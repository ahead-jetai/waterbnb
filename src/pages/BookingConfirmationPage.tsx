import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { BookingData } from '../types'
import { listings } from '../data/listings'

export default function BookingConfirmationPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [bookingReference, setBookingReference] = useState<string>('')
  const [total, setTotal] = useState<number>(0)

  const listing = listings.find(l => l.id === listingId)

  useEffect(() => {
    if (location.state && location.state.bookingData) {
      const data = location.state.bookingData
      // Check if all required data is present
      if (!data.guestDetails || !data.paymentDetails) {
        navigate(`/listing/${listingId}`)
        return
      }
      setBookingData(data)
      setBookingReference(location.state.bookingReference)
      setTotal(location.state.total)
    } else {
      navigate(`/listing/${listingId}`)
    }
  }, [location.state, listingId, navigate])

  if (!bookingData || !listing) {
    return null
  }

  const checkInDate = new Date(bookingData.dates.checkIn)
  const checkOutDate = new Date(bookingData.dates.checkOut)
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2">Booking confirmed!</h1>
          <p className="text-gray-600">
            Your reservation has been successfully confirmed. We've sent a confirmation email to{' '}
            <span className="font-semibold">{bookingData.guestDetails?.email}</span>
          </p>
        </div>

        {/* Booking Reference */}
        <div className="card mb-6 bg-sky-50 border-2 border-sky-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Booking Reference</p>
            <p className="text-2xl font-bold text-sky-600">{bookingReference}</p>
          </div>
        </div>

        {/* Booking Details */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Your trip details</h2>

          <div className="flex gap-4 mb-6">
            <img
              src={listing.image}
              alt={listing.title}
              className="w-32 h-32 object-cover rounded-lg"
            />
            <div>
              <h3 className="font-semibold text-lg mb-1">{listing.title}</h3>
              <p className="text-gray-600 mb-2">{listing.location}</p>
              <div className="flex items-center gap-2">
                <span className="text-yellow-500">★</span>
                <span className="font-semibold">{listing.rating}</span>
                <span className="text-gray-600 text-sm">({listing.reviews} reviews)</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 border-t pt-6">
            <div>
              <h4 className="font-semibold mb-3">Dates</h4>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">Check-in</p>
                  <p className="font-semibold">{formatDate(checkInDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Check-out</p>
                  <p className="font-semibold">{formatDate(checkOutDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-semibold">{nights} {nights === 1 ? 'night' : 'nights'}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Guest information</h4>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">Guest name</p>
                  <p className="font-semibold">{bookingData.guestDetails?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{bookingData.guestDetails?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold">{bookingData.guestDetails?.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Number of guests</p>
                  <p className="font-semibold">{bookingData.guests}</p>
                </div>
              </div>
            </div>
          </div>

          {bookingData.guestDetails?.specialRequests && (
            <div className="border-t pt-6 mt-6">
              <h4 className="font-semibold mb-2">Special requests</h4>
              <p className="text-gray-700">{bookingData.guestDetails.specialRequests}</p>
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Payment summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-700">
                ${listing.pricePerNight.toFixed(2)} × {nights} nights
              </span>
              <span className="font-semibold">
                ${(nights * listing.pricePerNight).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Service fee</span>
              <span className="font-semibold">
                ${(total - nights * listing.pricePerNight).toFixed(2)}
              </span>
            </div>
            <div className="border-t pt-3 flex justify-between text-lg font-bold">
              <span>Total paid</span>
              <span>${total.toFixed(2)} USD</span>
            </div>
            <div className="text-sm text-gray-600 pt-2">
              <p>Paid with card ending in {bookingData.paymentDetails?.cardNumber.slice(-4)}</p>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="card mb-6 bg-blue-50 border-2 border-blue-200">
          <h2 className="text-xl font-bold mb-3">Next steps</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">1.</span>
              <span>Check your email for booking confirmation and additional details</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">2.</span>
              <span>Your host will contact you within 24 hours with check-in instructions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">3.</span>
              <span>Save your booking reference number for future correspondence</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">4.</span>
              <span>Contact support if you need to make any changes to your reservation</span>
            </li>
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
