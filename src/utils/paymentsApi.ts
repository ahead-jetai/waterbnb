import { supabase } from './supabase'
import type { GuestDetails } from '../bookingTypes'

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
async function invoke<T>(route: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(`payments/${route}`, { body })
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

/** Create (or reuse) the host's Stripe connected account. */
export async function createConnectAccount(hostId: string, name: string, email: string): Promise<string> {
  const { accountId } = await invoke<{ accountId: string }>('connect-account', { hostId, name, email })
  return accountId
}

/** Stripe-hosted onboarding link for the host to complete KYC. */
export async function createOnboardingLink(hostId: string): Promise<string> {
  const { url } = await invoke<{ url: string }>('onboarding-link', { hostId })
  return url
}

/** Live onboarding/payout status — always read from the Stripe API. */
export async function fetchConnectStatus(hostId: string): Promise<ConnectStatus> {
  return invoke<ConnectStatus>('connect-status', { hostId })
}

/** Start hosted Checkout; resolves to the Stripe-hosted payment page URL. */
export async function startCheckout(input: {
  listingId: string
  guestId: string
  checkIn: string
  checkOut: string
  guests: number
  guestDetails: GuestDetails
}): Promise<string> {
  const { url } = await invoke<{ url: string }>('checkout', input)
  return url
}

export type CheckoutSessionResult = {
  paid: boolean
  amountTotal: number
  reference: string
  metadata: Record<string, string>
  /** Booking row persisted server-side by the edge function (null if unpaid). */
  booking: Record<string, unknown> | null
  /** Host↔guest chat opened server-side for this booking, if any. */
  conversationId: string | null
}

/** Verify a Checkout session after Stripe redirects back to the app. */
export async function fetchCheckoutSession(sessionId: string): Promise<CheckoutSessionResult> {
  return invoke<CheckoutSessionResult>('checkout-session', { sessionId })
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
export async function fetchEarnings(hostId: string): Promise<EarningsSummary> {
  return invoke<EarningsSummary>('earnings', { hostId })
}
