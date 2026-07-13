import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import type { BookingData, GuestDetails } from '../bookingTypes'
import { BookingProgress } from '../components/booking'

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
    setGuestDetails(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!guestDetails.name || !guestDetails.email || !guestDetails.phone) {
      alert('Please fill in all required fields')
      return
    }

    const updatedBookingData: BookingData = { ...bookingData, guestDetails }
    navigate(`/booking/${listingId}/payment`, { state: { bookingData: updatedBookingData } })
  }

  const handleBack = () => {
    navigate(`/booking/${listingId}/review`, { state: { bookingData } })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container-p py-8 max-w-2xl">
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
          <BookingProgress currentStep={2} />
          <h1 className="font-display text-3xl font-medium text-muted text-center">Guest details</h1>
        </div>

        <form onSubmit={handleSubmit} className="card p-6">
          <div className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                Full name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={guestDetails.name}
                onChange={handleInputChange}
                className="input"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email address <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={guestDetails.email}
                onChange={handleInputChange}
                className="input"
                placeholder="john.doe@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                Phone number <span className="text-danger">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={guestDetails.phone}
                onChange={handleInputChange}
                className="input"
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>

            <div>
              <label htmlFor="specialRequests" className="block text-sm font-medium text-slate-700 mb-1.5">
                Special requests <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="specialRequests"
                name="specialRequests"
                value={guestDetails.specialRequests}
                onChange={handleInputChange}
                rows={4}
                className="input resize-none"
                placeholder="Let the host know if you have any special requests..."
              />
            </div>

            <div className="pt-2">
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
