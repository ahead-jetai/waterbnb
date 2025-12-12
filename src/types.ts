export type Listing = {
  id: string
  title: string
  location: string // e.g., "Split, Croatia"
  pricePerNight: number
  rating: number // 0..5
  reviews: number
  image: string
  tags: string[]
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
