import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import type { BookingData, Listing, PaymentDetails } from '../bookingTypes'
import { fetchListing } from '../utils/listingsApi'
import { createBooking } from '../utils/bookingsApi'
import { BookingProgress } from '../components/booking'

export default function PaymentPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useUser()
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [listing, setListing] = useState<Listing | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: ''
  })

  useEffect(() => {
    if (!listingId) return
    let cancelled = false
    fetchListing(listingId).then(l => { if (!cancelled) setListing(l) })
    return () => { cancelled = true }
  }, [listingId])

  useEffect(() => {
    if (location.state && location.state.bookingData) {
      const data = location.state.bookingData
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

    if (name === 'cardNumber') {
      formattedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim()
      if (formattedValue.replace(/\s/g, '').length > 16) return
    }
    if (name === 'expiryDate') {
      formattedValue = value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5)
    }
    if (name === 'cvv') {
      formattedValue = value.replace(/\D/g, '').slice(0, 3)
    }

    setPaymentDetails(prev => ({ ...prev, [name]: formattedValue }))
  }

  const handleAutofill = () => {
    setPaymentDetails({
      cardNumber: '4532 1234 5678 9010',
      expiryDate: '12/25',
      cvv: '123',
      nameOnCard: 'John Doe'
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!paymentDetails.cardNumber || !paymentDetails.expiryDate || !paymentDetails.cvv || !paymentDetails.nameOnCard) {
      alert('Please fill in all payment fields')
      return
    }
    if (paymentDetails.cardNumber.replace(/\s/g, '').length !== 16) {
      alert('Please enter a valid 16-digit card number')
      return
    }
    if (paymentDetails.cvv.length !== 3) {
      alert('Please enter a valid 3-digit CVV')
      return
    }
    if (!listingId || !user || !bookingData.guestDetails) {
      alert('You must be signed in with guest details to complete a booking')
      return
    }

    const updatedBookingData: BookingData = { ...bookingData, paymentDetails }
    const bookingReference = 'WB' + Date.now().toString().slice(-8)

    setSubmitting(true)
    try {
      await createBooking({
        listingId,
        guestId: user.id,
        checkIn: bookingData.dates.checkIn,
        checkOut: bookingData.dates.checkOut,
        guests: bookingData.guests,
        guestDetails: bookingData.guestDetails,
        subtotal,
        serviceFee,
        total,
        bookingReference,
      })
      navigate(`/booking/${listingId}/confirmation`, {
        state: { bookingData: updatedBookingData, bookingReference, total }
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not complete booking. Please try again.')
    } finally {
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
          <h1 className="font-display text-3xl font-medium text-muted text-center">Payment details</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Payment Form */}
          <div>
            <form onSubmit={handleSubmit} className="card p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-base">Pay with card</h3>
                <button
                  type="button"
                  onClick={handleAutofill}
                  className="text-sm text-brand hover:text-brand-dark font-medium no-underline"
                >
                  Autofill (Testing)
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="cardNumber" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Card number <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="cardNumber"
                    name="cardNumber"
                    value={paymentDetails.cardNumber}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="1234 5678 9012 3456"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expiryDate" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Expiry date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="expiryDate"
                      name="expiryDate"
                      value={paymentDetails.expiryDate}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="MM/YY"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="cvv" className="block text-sm font-medium text-slate-700 mb-1.5">
                      CVV <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="cvv"
                      name="cvv"
                      value={paymentDetails.cvv}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="123"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="nameOnCard" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Name on card <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="nameOnCard"
                    name="nameOnCard"
                    value={paymentDetails.nameOnCard}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                    {submitting ? 'Processing…' : `Complete booking — $${total.toFixed(2)}`}
                  </button>
                </div>

                <p className="text-xs text-slate-400 text-center">
                  This is a demo. Any 16-digit card number will be accepted.
                </p>
              </div>
            </form>
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
                  <span className="text-slate-500">${listing.pricePerNight.toFixed(2)} × {nights} nights</span>
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
