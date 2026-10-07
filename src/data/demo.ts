import { calculateBookingTotals } from '../utils/booking'

// Fictional fixtures shared by every scene. This module has no service clients.
export const demoHost = { name: 'Maya Chen', firstName: 'Maya', initials: 'MC', phone: '+1 (415) 555-0106' }
export const demoGuest = { name: 'Alex Rivera', firstName: 'Alex', initials: 'AR', phone: '+1 (415) 555-0118' }
export const demoListing = {
  title: 'Blue Haven Houseboat',
  location: 'Sausalito, California',
  image: '/images/water-bnb-hero-carousel-3.png',
  pricePerNight: 200,
  guests: 2,
  nights: 3,
  dates: 'Nov 12–15',
  description: 'A peaceful floating hideaway with a private deck, sunset views, and everything you need for a weekend on the water.',
}

const totals = calculateBookingTotals(demoListing.pricePerNight, demoListing.nights)
// Match the app's estimated processing fee: 2.9% of the guest total + $0.30.
const processingFee = (Math.round(totals.total * 100 * 0.029) + 30) / 100
export const demoPayment = {
  ...totals,
  processingFee,
  hostNet: Math.round((totals.subtotal - processingFee) * 100) / 100,
  reference: 'DEMO-BLUE-001',
}

export const demoSteps = [
  { id: 'sign-in', label: 'Sign in', title: 'Meet Maya, our new host', actor: 'host', area: 'Sign in', action: 'Verify & sign in', description: 'Maya signs in with her phone number and a demo verification code.' },
  { id: 'host', label: 'Become a host', title: 'A traveler becomes a host', actor: 'host', area: 'Your profile', action: 'Switch to hosting', description: 'Maya switches to hosting and sets up her public host profile.' },
  { id: 'payouts', label: 'Set up payments', title: 'Get ready to receive payments', actor: 'host', area: 'Payments', action: 'Complete demo onboarding', description: 'Her fictional payout account is connected, ready for her first reservation.' },
  { id: 'listing', label: 'Create a spot', title: 'Give Blue Haven a home on WaterBnB', actor: 'host', area: 'Create listing', action: 'Publish demo listing', description: 'Maya adds photos, amenities, a nightly price, and chooses to review booking requests.' },
  { id: 'published', label: 'Listing goes live', title: 'Blue Haven is ready for guests', actor: 'host', area: 'Hosting dashboard', action: 'Meet our guest', description: 'Her new houseboat appears in her hosting dashboard and is ready to discover.' },
  { id: 'guest-sign-in', label: 'Guest signs in', title: 'Meet Alex, our weekend traveler', actor: 'guest', area: 'Sign in', action: 'Sign in as Alex', description: 'The story switches to Alex, who signs in with a separate fictional guest account.' },
  { id: 'guest', label: 'Find the spot', title: 'Alex finds a weekend on the water', actor: 'guest', area: 'Explore', action: 'Request to book', description: 'Alex discovers Maya’s houseboat and picks a three-night stay for two guests.' },
  { id: 'request', label: 'Request a stay', title: 'Three nights, two guests', actor: 'guest', area: 'Booking review', action: 'Send booking request', description: 'Alex requests the stay. Nothing is charged while Maya reviews the request.' },
  { id: 'approval', label: 'Host approves', title: 'Maya welcomes her first guests', actor: 'host', area: 'Booking requests', action: 'Approve request', description: 'Back in her hosting dashboard, Maya reviews Alex’s request and approves it.' },
  { id: 'checkout', label: 'Guest pays', title: 'Approval unlocks checkout', actor: 'guest', area: 'Checkout', action: 'Simulate payment', description: 'Alex pays for the approved stay using a fictional saved payment method.' },
  { id: 'confirmation', label: 'Stay confirmed', title: 'A little adventure, officially booked', actor: 'guest', area: 'My Trips', action: 'View host earnings', description: 'Payment succeeds and Alex sees a confirmed reservation in My Trips.' },
  { id: 'earnings', label: 'Host gets paid', title: 'From empty deck to first earnings', actor: 'host', area: 'Payments & earnings', action: 'Finish demo', description: 'Maya checks the payment, fee breakdown, and simulated payout to her bank.' },
] as const

export type DemoStep = typeof demoSteps[number]
