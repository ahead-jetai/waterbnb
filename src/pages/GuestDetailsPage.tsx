import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { BookingData, GuestDetails } from '../types'

export default function GuestDetailsPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [guestDetails, setGuestDetails] = useState<GuestDetails>({
    name: '',
    email: '',
    phone: '',
    specialRequests: ''
  })

  useEffect(() => {
    if (location.state && location.state.bookingData) {
      setBookingData(location.state.bookingData)
    } else {
      navigate(`/listing/${listingId}`)
    }
  }, [location.state, listingId, navigate])

  if (!bookingData) {
    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setGuestDetails(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!guestDetails.name || !guestDetails.email || !guestDetails.phone) {
      alert('Please fill in all required fields')
      return
    }

    // Update booking data with guest details
    const updatedBookingData: BookingData = {
      ...bookingData,
      guestDetails
    }

    navigate(`/booking/${listingId}/payment`, {
      state: { bookingData: updatedBookingData }
    })
  }

  const handleBack = () => {
    navigate(`/booking/${listingId}/review`, {
      state: { bookingData }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="text-sky-500 hover:text-sky-600 mb-4 flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold mb-2">Guest details</h1>
          <p className="text-gray-600">Step 2 of 3</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card">
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold mb-2">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={guestDetails.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-2">
                Email address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={guestDetails.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="john.doe@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-semibold mb-2">
                Phone number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={guestDetails.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>

            <div>
              <label htmlFor="specialRequests" className="block text-sm font-semibold mb-2">
                Special requests (optional)
              </label>
              <textarea
                id="specialRequests"
                name="specialRequests"
                value={guestDetails.specialRequests}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Let the host know if you have any special requests..."
              />
            </div>

            <div className="pt-4">
              <button type="submit" className="btn btn-primary w-full">
                Continue to payment
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
