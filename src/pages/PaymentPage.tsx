import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { BookingData, PaymentDetails } from '../types'
import { listings } from '../data/listings'

export default function PaymentPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: ''
  })

  const listing = listings.find(l => l.id === listingId)

  useEffect(() => {
    if (location.state && location.state.bookingData) {
      const data = location.state.bookingData
      // Check if guest details were filled
      if (!data.guestDetails) {
        navigate(`/booking/${listingId}/guest-details`, { state: { bookingData: data } })
        return
      }
      setBookingData(data)
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
  const subtotal = nights * listing.pricePerNight
  const serviceFee = subtotal * 0.12
  const total = subtotal + serviceFee

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    let formattedValue = value

    // Format card number (16 digits with spaces)
    if (name === 'cardNumber') {
      formattedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim()
      if (formattedValue.replace(/\s/g, '').length > 16) return
    }

    // Format expiry date (MM/YY)
    if (name === 'expiryDate') {
      formattedValue = value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5)
    }

    // Format CVV (3 digits)
    if (name === 'cvv') {
      formattedValue = value.replace(/\D/g, '').slice(0, 3)
    }

    setPaymentDetails(prev => ({
      ...prev,
      [name]: formattedValue
    }))
  }

  const handleAutofill = () => {
    setPaymentDetails({
      cardNumber: '4532 1234 5678 9010',
      expiryDate: '12/25',
      cvv: '123',
      nameOnCard: 'John Doe'
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!paymentDetails.cardNumber || !paymentDetails.expiryDate || !paymentDetails.cvv || !paymentDetails.nameOnCard) {
      alert('Please fill in all payment fields')
      return
    }

    // Validate card number (16 digits)
    const cardNumberDigits = paymentDetails.cardNumber.replace(/\s/g, '')
    if (cardNumberDigits.length !== 16) {
      alert('Please enter a valid 16-digit card number')
      return
    }

    // Validate CVV (3 digits)
    if (paymentDetails.cvv.length !== 3) {
      alert('Please enter a valid 3-digit CVV')
      return
    }

    // Update booking data with payment details
    const updatedBookingData: BookingData = {
      ...bookingData,
      paymentDetails
    }

    // Generate a booking reference
    const bookingReference = 'WB' + Date.now().toString().slice(-8)

    navigate(`/booking/${listingId}/confirmation`, {
      state: {
        bookingData: updatedBookingData,
        bookingReference,
        total
      }
    })
  }

  const handleBack = () => {
    navigate(`/booking/${listingId}/guest-details`, {
      state: { bookingData }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="text-sky-500 hover:text-sky-600 mb-4 flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold mb-2">Payment details</h1>
          <p className="text-gray-600">Step 3 of 3</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Payment Form */}
          <div>
            <form onSubmit={handleSubmit} className="card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Pay with card</h3>
                <button
                  type="button"
                  onClick={handleAutofill}
                  className="text-sm text-sky-500 hover:text-sky-600 font-semibold"
                >
                  🔄 Autofill (Testing)
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label htmlFor="cardNumber" className="block text-sm font-semibold mb-2">
                    Card number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="cardNumber"
                    name="cardNumber"
                    value={paymentDetails.cardNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="1234 5678 9012 3456"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expiryDate" className="block text-sm font-semibold mb-2">
                      Expiry date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="expiryDate"
                      name="expiryDate"
                      value={paymentDetails.expiryDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="MM/YY"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="cvv" className="block text-sm font-semibold mb-2">
                      CVV <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="cvv"
                      name="cvv"
                      value={paymentDetails.cvv}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="123"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="nameOnCard" className="block text-sm font-semibold mb-2">
                    Name on card <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="nameOnCard"
                    name="nameOnCard"
                    value={paymentDetails.nameOnCard}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="pt-4">
                  <button type="submit" className="btn btn-primary w-full">
                    Complete booking - ${total.toFixed(2)}
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  This is a demo booking system. Any 16-digit card number will be accepted.
                </p>
              </div>
            </form>
          </div>

          {/* Right Column - Booking Summary */}
          <div>
            <div className="card sticky top-8">
              <h3 className="text-lg font-semibold mb-4">Booking summary</h3>

              <div className="mb-4">
                <img
                  src={listing.image}
                  alt={listing.title}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
                <h4 className="font-semibold">{listing.title}</h4>
                <p className="text-sm text-gray-600">{listing.location}</p>
              </div>

              <div className="border-t pt-4 space-y-2 mb-4">
                <div className="text-sm">
                  <span className="text-gray-600">Check-in:</span>{' '}
                  <span className="font-semibold">
                    {checkInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Check-out:</span>{' '}
                  <span className="font-semibold">
                    {checkOutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Guests:</span>{' '}
                  <span className="font-semibold">{bookingData.guests}</span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    ${listing.pricePerNight.toFixed(2)} × {nights} nights
                  </span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Service fee</span>
                  <span>${serviceFee.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
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
