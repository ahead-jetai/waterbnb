/**
 * Booking-related utility functions
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24

/**
 * Calculate the number of nights between check-in and check-out dates
 */
export function calculateNights(checkIn: string | Date, checkOut: string | Date): number {
  const checkInDate = typeof checkIn === 'string' ? new Date(checkIn) : checkIn
  const checkOutDate = typeof checkOut === 'string' ? new Date(checkOut) : checkOut
  return Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / MS_PER_DAY)
}

/**
 * Format date for display in long format (e.g., "Monday, January 15, 2024")
 */
export function formatDateLong(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Format date for display in short format (e.g., "Jan 15, 2024")
 */
export function formatDateShort(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return `$${amount.toFixed(2)}${currency !== 'USD' ? ` ${currency}` : ''}`
}

/**
 * Pluralize a word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`)
}

/**
 * Service fee rate (12%)
 */
export const SERVICE_FEE_RATE = 0.12

/**
 * Calculate booking totals
 */
export function calculateBookingTotals(pricePerNight: number, nights: number) {
  const subtotal = nights * pricePerNight
  const serviceFee = subtotal * SERVICE_FEE_RATE
  const total = subtotal + serviceFee
  return { subtotal, serviceFee, total }
}
