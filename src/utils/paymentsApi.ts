import { supabase } from './supabase'
import type { BookingStatus, GuestDetails, RefundStatus } from '../bookingTypes'
import type { BookingRow } from './bookingsApi'

/**
 * Client for the `payments` Supabase Edge Function, which owns all Stripe
 * calls so the secret key never reaches the browser.
 */

export type ConnectStatus = {
  hasAccount: boolean
  accountId?: string
  readyToReceivePayments?: boolean
  onboardingComplete?: boolean
  requirementsStatus?: string | null
}

/** Invoke a route of the payments edge function, unwrapping errors. */
type TokenGetter = () => Promise<string | null>

async function invoke<T>(route: string, getToken: TokenGetter, body: Record<string, unknown> = {}): Promise<T> {
  const token = await getToken()
  if (!token) throw new Error('Sign in to continue')
  const { data, error } = await supabase.functions.invoke(`payments/${route}`, {
    body, headers: { 'x-clerk-token': token },
  })
  if (error) {
    // FunctionsHttpError carries the function's JSON error body in context.
    if ('context' in error && error.context instanceof Response) {
      const payload = await error.context.json().catch(() => null)
      if (payload?.error) throw new Error(payload.error)
    }

    throw new Error(error.message ?? 'Payment request failed')
  }
  return data as T
}

export async function fetchPilotAccess(getToken: TokenGetter, listingId: string): Promise<boolean> {
  const { eligible } = await invoke<{ eligible: boolean }>('pilot-access', getToken, { listingId })
  return eligible
}

/** Create (or reuse) the host's Stripe connected account. */
export async function createConnectAccount(getToken: TokenGetter, name: string, email: string): Promise<string> {
  const { accountId } = await invoke<{ accountId: string }>('connect-account', getToken, { name, email })
  return accountId
}

/** Stripe-hosted onboarding link for the host to complete KYC. */
export async function createOnboardingLink(getToken: TokenGetter): Promise<string> {
  const { url } = await invoke<{ url: string }>('onboarding-link', getToken)
  return url
}

/** Live onboarding/payout status — always read from the Stripe API. */
export async function fetchConnectStatus(getToken: TokenGetter): Promise<ConnectStatus> {
  return invoke<ConnectStatus>('connect-status', getToken)
}

/** Start hosted Checkout; resolves to the Stripe-hosted payment page URL. */
export async function startCheckout(getToken: TokenGetter, input: {
  listingId: string
  checkIn: string
  checkOut: string
  guests: number
  guestDetails: GuestDetails
}): Promise<string> {
  const { url } = await invoke<{ url: string }>('checkout', getToken, input)
  return url
}

/** Create an unpaid host-review booking request. */
export async function createBookingRequest(getToken: TokenGetter, input: {
  listingId: string
  checkIn: string
  checkOut: string
  guests: number
  guestDetails: GuestDetails
}): Promise<{ booking: Record<string, unknown> }> {
  return invoke<{ booking: Record<string, unknown> }>('booking-request', getToken, input)
}

/** Start Stripe Checkout for a host-approved request. */
export async function startApprovedRequestCheckout(getToken: TokenGetter, bookingId: string): Promise<string> {
  const { url } = await invoke<{ url: string }>('approved-request-checkout', getToken, { bookingId })
  return url
}

export async function fetchCheckoutBooking(getToken: TokenGetter, bookingId: string) {
  const { booking } = await invoke<{ booking: BookingRow }>('checkout-booking', getToken, { bookingId })
  return booking
}

export type CheckoutSessionResult = {
  paid: boolean
  amountTotal: number
  reference: string
  /** Booking row persisted server-side by the edge function (null if unpaid). */
  booking: BookingRow | null
  /** Host↔guest chat opened server-side for this booking, if any. */
  conversationId: string | null
}

/** Verify a Checkout session after Stripe redirects back to the app. */
export async function fetchCheckoutSession(getToken: TokenGetter, sessionId: string): Promise<CheckoutSessionResult> {
  return invoke<CheckoutSessionResult>('checkout-session', getToken, { sessionId })
}

/** Host accepts a pending booking request. Server creates chat/notifications and declines overlapping pending requests. */
export async function approveBookingRequest(getToken: TokenGetter, bookingId: string): Promise<{ booking: Record<string, unknown>; conversationId: string | null }> {
  return invoke<{ booking: Record<string, unknown>; conversationId: string | null }>('approve-booking', getToken, { bookingId })
}

/** Host declines a pending booking request. */
export async function declineBookingRequest(getToken: TokenGetter, bookingId: string): Promise<{ booking: Record<string, unknown> }> {
  return invoke<{ booking: Record<string, unknown> }>('decline-booking', getToken, { bookingId })
}

export async function cancelBooking(getToken: TokenGetter, bookingId: string): Promise<{
  status: BookingStatus
  refundStatus: RefundStatus
}> {
  return invoke('cancel-booking', getToken, { bookingId })
}

/** Toggle instant booking server-side; enabling it clears existing pending review requests for that listing. */
export async function setListingAutoApprove(getToken: TokenGetter, listingId: string, enabled: boolean): Promise<void> {
  await invoke<{ ok: boolean }>('listing-auto-approve', getToken, { listingId, enabled })
}

export type StripeTransfer = {
  id: string
  amountCents: number
  created: number // unix seconds
  description: string | null
  reversed: boolean
}

export type StripePayout = {
  id: string
  amountCents: number
  created: number
  arrivalDate: number
  status: string
}

export type EarningsSummary = {
  hasAccount: boolean
  accountId?: string
  availableCents?: number
  pendingCents?: number
  lifetimeCents?: number
  transfers?: StripeTransfer[]
  payouts?: StripePayout[]
}

/** Live earnings data (balance, transfers, payouts) from the host's Stripe account. */
export async function fetchEarnings(getToken: TokenGetter): Promise<EarningsSummary> {
  return invoke<EarningsSummary>('earnings', getToken)
}
