import type { Listing } from '../bookingTypes'

export function isInstantBooking(listing: Pick<Listing, 'autoApproveBookings'>): boolean {
  return listing.autoApproveBookings ?? true
}

export function bookingModeLabel(listing: Pick<Listing, 'autoApproveBookings'>): string {
  return isInstantBooking(listing) ? 'Instant booking' : 'Host review'
}

export function bookingModeSummary(listing: Pick<Listing, 'autoApproveBookings'>): string {
  return isInstantBooking(listing)
    ? 'This listing confirms automatically after payment, and host chat opens right away.'
    : 'This listing requires host approval before payment. You will only pay if the host accepts your request.'
}
