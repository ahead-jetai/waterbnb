export type Listing = {
  id: string
  title: string
  location: string // e.g., "Split, Croatia"
  pricePerNight: number
  rating: number // 0..5
  reviews: number
  image: string
  images?: string[] // all photos; `image` is the cover (first photo)
  tags: string[]
  description?: string
  capacity?: number
  boatType?: string
  hostId?: string
}

export type BookingDates = {
  checkIn: string // ISO date string
  checkOut: string
}

export type GuestDetails = {
  name: string
  email: string
  phone: string
  specialRequests?: string
}

export type PaymentDetails = {
  cardNumber: string
  expiryDate: string
  cvv: string
  nameOnCard: string
}

export type BookingData = {
  listingId: string
  dates: BookingDates
  guests: number
  guestDetails?: GuestDetails
  paymentDetails?: PaymentDetails
}

export type BookingStatus = 'confirmed' | 'cancelled'

/** A persisted booking, as stored in Supabase. */
export type Booking = {
  id: string
  listingId: string
  guestId: string
  checkIn: string // ISO date string
  checkOut: string
  guests: number
  status: BookingStatus
  guestDetails: GuestDetails
  subtotal: number
  serviceFee: number
  total: number
  bookingReference: string
  createdAt: string
  listing?: Listing
}
