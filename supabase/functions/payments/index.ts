/**
 * WaterBnB payments — Stripe Connect integration as a Supabase Edge Function.
 *
 * Hosts are onboarded as Stripe connected accounts (marketplace/recipient
 * configuration, Express dashboard). Guests pay through Stripe hosted
 * Checkout; each payment is a destination charge. The application fee is the
 * 12% service fee plus the estimated Stripe processing fee, so the host
 * receives the nightly subtotal minus processing costs and WaterBnB nets its
 * full 12%.
 *
 * Routes (all POST, dispatched on the sub-path after /payments):
 *   /connect-account   { name, email }                -> { accountId }
 *   /onboarding-link   {}                             -> { url }
 *   /connect-status    {}                             -> { hasAccount, ... }
 *   /booking-request   { listingId, ... }             -> { booking }
 *   /checkout          { listingId, ... }             -> { url }
 *   /approved-request-checkout { bookingId }          -> { url }
 *   /checkout-booking  { bookingId }                  -> { booking }
 *   /checkout-session  { sessionId }                  -> { paid, booking, conversationId, ... }
 *   /approve-booking   { bookingId }                  -> { booking, conversationId }
 *   /decline-booking   { bookingId }                  -> { booking }
 *   /cancel-booking    { bookingId }                  -> { status, refundStatus }
 *   /listing-auto-approve { listingId, enabled }      -> { ok }
 *   /webhook           signed Stripe Checkout events
 *   /earnings          {}                             -> { hasAccount, balance, transfers, ... }
 *
 * Required secrets (Dashboard -> Edge Functions -> Secrets, or `supabase secrets set`):
 *   STRIPE_SECRET_KEY  — restricted Stripe API key. Never expose to the browser.
 *   STRIPE_CHECKOUT_WEBHOOK_SECRET — signing secret for this webhook endpoint.
 *   CLERK_ISSUER       — exact Clerk session issuer URL.
 *   CLIENT_URL         — where the SPA runs (e.g. http://localhost:5173).
 * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Stripe from 'npm:stripe@22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createClerkVerifier } from '../_shared/clerk.ts'
import { getEnvironment, requireStripeKey } from '../_shared/environment.ts'

// --- Step 0: configuration, failing fast with helpful errors -------------

const { mode, clientOrigin: clientUrl, clerkIssuer } = getEnvironment(name => Deno.env.get(name))
const live = mode === 'production'
const stripeSecretKey = requireStripeKey(Deno.env.get('STRIPE_SECRET_KEY'), live)

// One Stripe client for ALL requests. The SDK pins the latest API version
// (2026-06-24.dahlia at the time of writing) automatically.
const stripeClient = new Stripe(stripeSecretKey)

// Service-role client: the function is trusted backend code.
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const verifiedUserId = createClerkVerifier(clerkIssuer, clientUrl)
const webhookSecret = Deno.env.get('STRIPE_CHECKOUT_WEBHOOK_SECRET')
const stripeCrypto = Stripe.createSubtleCryptoProvider()

type CheckoutBooking = {
  id: string
  listing_id: string
  guest_id: string
  guest_email: string
  status: string
  checkout_session_id: string | null
  checkout_expires_at: string
  refund_cutoff_at: string
  checkout_params: {
    client_url: string
    check_in_zone: string
    title: string
    nightly: number
    nights: number
    service_fee: number
    application_fee: number
    destination: string
  }
}

type RefundBooking = {
  id: string
  total: number
  status: string
  refund_status: 'requested' | 'pending' | 'succeeded' | 'failed'
  refund_requested_at: string
  stripe_refund_id: string | null
  stripe_payment_intent_id: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': clientUrl,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clerk-token',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function fail(status: number, message: string): Response {
  return json({ error: message }, status)
}

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000)
}

function calculateAmounts(listing: any, checkIn: string, checkOut: string) {
  const nights = nightsBetween(checkIn, checkOut)
  if (nights <= 0) throw new Error('checkOut must be after checkIn')
  const nightlyCents = Math.round(Number(listing.price_per_night) * 100)
  const subtotalCents = nightlyCents * nights
  const serviceFeeCents = Math.round(subtotalCents * 0.12)
  const totalCents = subtotalCents + serviceFeeCents
  const stripeFeeCents = Math.round(totalCents * 0.029) + 30
  const applicationFeeCents = serviceFeeCents + stripeFeeCents
  return { nights, nightlyCents, subtotalCents, serviceFeeCents, totalCents, stripeFeeCents, applicationFeeCents }
}

/** Look up the Stripe account id we stored for a host (Clerk user id). */
async function getHostAccountId(hostId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('host_profiles')
    .select('stripe_account_id')
    .eq('id', hostId)
    .maybeSingle()
  if (error) throw new Error(`Supabase error: ${error.message}`)
  return data?.stripe_account_id ?? null
}

// --- Step 1: create a connected account for a host -----------------------
// The platform (WaterBnB) owns pricing and fee collection, so the account is
// created with the v2 API as a *recipient* with Express dashboard access —
// never with the deprecated top-level `type` parameter.
async function connectAccount(body: Record<string, unknown>, hostId: string): Promise<Response> {
  const { name, email } = body as { name?: string; email?: string }
  if (!email) return fail(400, 'email is required')

  // Reuse the existing account if this host already has one.
  const existing = await getHostAccountId(hostId)
  if (existing) return json({ accountId: existing })

  const account = await stripeClient.v2.core.accounts.create({
    display_name: name || 'WaterBnB host',
    contact_email: email,
    identity: {
      country: 'us',
    },
    // Express dashboard: cobranded, Stripe-hosted, low maintenance.
    dashboard: 'express',
    defaults: {
      responsibilities: {
        // WaterBnB is billed Stripe's fees and absorbs negative balances —
        // required for the destination-charge marketplace pattern.
        fees_collector: 'application',
        losses_collector: 'application',
      },
    },
    configuration: {
      // Recipient config only: hosts receive transfers; they are not the
      // merchant of record, so no merchant/card_payments capability.
      recipient: {
        capabilities: {
          stripe_balance: {
            stripe_transfers: {
              requested: true,
            },
          },
        },
      },
    },
  })

  // Persist the host -> account mapping next to the host's public profile.
  const { error } = await supabase
    .from('host_profiles')
    .upsert({ id: hostId, stripe_account_id: account.id }, { onConflict: 'id' })
  if (error) throw new Error(`Could not store account mapping: ${error.message}`)

  return json({ accountId: account.id })
}

// --- Step 2: onboarding -----------------------------------------------------
// Generates a Stripe-hosted Account Link where the host completes KYC. The
// app shows an "Onboard to collect payments" button that opens this link,
// plus live status (always read from the API, never cached).
async function onboardingLink(hostId: string): Promise<Response> {
  const accountId = await getHostAccountId(hostId)
  if (!accountId) return fail(404, 'No connected account for this host yet')

  const accountLink = await stripeClient.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        configurations: ['recipient'],
        // Where Stripe sends the host if the link expires / after finishing.
        refresh_url: `${clientUrl}/host/payments`,
        return_url: `${clientUrl}/host/payments?accountId=${accountId}`,
      },
    },
  })

  return json({ url: accountLink.url })
}

// Live onboarding/payout status straight from the Accounts v2 API.
async function connectStatus(hostId: string): Promise<Response> {
  const accountId = await getHostAccountId(hostId)
  if (!accountId) return json({ hasAccount: false })

  const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
    include: ['configuration.recipient', 'requirements'],
  })

  // Ready when the stripe_transfers capability is active (v2 status path —
  // the v1 charges_enabled/payouts_enabled fields are deprecated).
  const readyToReceivePayments =
    account?.configuration?.recipient?.capabilities?.stripe_balance
      ?.stripe_transfers?.status === 'active'

  const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status
  const onboardingComplete =
    requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due'

  return json({
    hasAccount: true,
    accountId,
    readyToReceivePayments,
    onboardingComplete,
    requirementsStatus: requirementsStatus ?? null,
  })
}

// --- Step 4a: host-review booking requests ---------------------------------
// For manual-review listings, guests should not be charged until the host
// accepts. This creates an unpaid pending request and notifies both sides.
async function bookingRequest(body: Record<string, unknown>, guestId: string): Promise<Response> {
  const { listingId, checkIn, checkOut, guests, guestDetails } = body as {
    listingId?: string
    checkIn?: string
    checkOut?: string
    guests?: number
    guestDetails?: { name?: string; email?: string; phone?: string; specialRequests?: string }
  }
  if (!listingId || !checkIn || !checkOut || !guests || !guestDetails?.email) {
    return fail(400, 'listingId, checkIn, checkOut, guests, and guestDetails are required')
  }

  const { data: listing, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .maybeSingle()
  if (error || !listing) return fail(404, 'Listing not found')
  if (!listing.host_id) return fail(400, 'This listing has no host')
  if (listing.auto_approve_bookings ?? true) {
    return fail(409, 'This listing is instant booking. Please use checkout.')
  }

  const amounts = calculateAmounts(listing, checkIn, checkOut)
  const reference = 'RQ' + crypto.randomUUID().slice(0, 8).toUpperCase()
  const { data: booking, error: inserted } = await supabase
    .from('bookings')
    .insert({
      listing_id: listingId,
      guest_id: guestId,
      check_in: checkIn,
      check_out: checkOut,
      guests: Number(guests),
      status: 'pending',
      guest_name: guestDetails.name ?? '',
      guest_email: guestDetails.email,
      guest_phone: guestDetails.phone ?? '',
      special_requests: guestDetails.specialRequests || null,
      subtotal: amounts.subtotalCents / 100,
      service_fee: amounts.serviceFeeCents / 100,
      total: amounts.totalCents / 100,
      booking_reference: reference,
    })
    .select()
    .single()
  if (inserted) throw new Error(`Could not save booking request: ${inserted.message}`)

  const checkInLong = new Date(checkIn + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const nightsLabel = `${amounts.nights} night${amounts.nights === 1 ? '' : 's'}`
  const notified = await supabase.from('notifications').insert([
    {
      user_id: listing.host_id,
      title: 'New booking request',
      body: `${guestDetails.name ?? 'A guest'} requested ${listing.title} for ${nightsLabel}, checking in ${checkInLong}. Review it on your host dashboard.`,
      link: '/hosting',
    },
    {
      user_id: guestId,
      title: 'Booking request sent',
      body: `Your request for ${listing.title} is waiting for host approval. You will only pay if the host accepts.`,
      link: '/trips',
    },
  ])
  if (notified.error) console.error('Could not create request notifications:', notified.error.message)

  return json({ booking })
}

// --- Step 4b: checkout -------------------------------------------------------
// Guests pay through Stripe hosted Checkout. This is a destination charge:
// the full amount is charged by the platform, the host's share flows to
// their connected account, and WaterBnB retains the service fee plus the
// estimated processing fee via application_fee_amount.
async function checkout(body: Record<string, unknown>, guestId: string): Promise<Response> {
  const { listingId, checkIn, checkOut, guests, guestDetails } = body as {
    listingId?: string
    checkIn?: string
    checkOut?: string
    guests?: number
    guestDetails?: { name?: string; email?: string; phone?: string; specialRequests?: string }
  }
  if (typeof listingId !== 'string' || typeof checkIn !== 'string' || typeof checkOut !== 'string' ||
      !validDates(checkIn, checkOut) ||
      typeof guests !== 'number' || !Number.isInteger(guests) || guests <= 0 ||
      typeof guestDetails?.email !== 'string' || !guestDetails.email) {
    return fail(400, 'listingId, checkIn, checkOut, guests, and guestDetails are required')
  }

  const { data: listing, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .maybeSingle()
  if (error || !listing) return fail(404, 'Listing not found')
  if (!listing.host_id) return fail(400, 'This listing has no host to pay')
  if (guests > listing.capacity) return fail(400, 'Too many guests for this listing')
  return reserveAndCheckout(listing, guestId, null, checkIn, checkOut, {
    check_in: checkIn, check_out: checkOut, guests, name: guestDetails.name ?? '',
    email: guestDetails.email, phone: guestDetails.phone ?? '', special_requests: guestDetails.specialRequests || null,
  })
}

function validDates(checkIn: string, checkOut: string) {
  const isDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const date = new Date(value)
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  }
  return isDate(checkIn) && isDate(checkOut) && checkIn < checkOut
}

async function bookingAwaitingCheckout(bookingId: string, guestId: string) {
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*, listing:listings!inner(*)')
    .eq('id', bookingId)
    .eq('guest_id', guestId)
    .in('status', ['approved_payment_pending', 'checkout_pending'])
    .maybeSingle()
  if (error) throw new Error(`Could not load approved request: ${error.message}`)
  return booking
}

async function checkoutBooking(body: Record<string, unknown>, guestId: string): Promise<Response> {
  const { bookingId } = body
  if (typeof bookingId !== 'string' || !bookingId) return fail(400, 'bookingId is required')
  const booking = await bookingAwaitingCheckout(bookingId, guestId)
  if (!booking) return fail(404, 'Booking awaiting payment not found.')
  return json({ booking })
}

async function approvedRequestCheckout(body: Record<string, unknown>, guestId: string): Promise<Response> {
  const { bookingId } = body
  if (typeof bookingId !== 'string' || !bookingId) return fail(400, 'bookingId is required')
  const booking = await bookingAwaitingCheckout(bookingId, guestId)
  if (!booking) return fail(404, 'Approved booking request not found')

  const listing = booking.listing
  if (!listing?.host_id) return fail(400, 'This listing has no host to pay')
  if (booking.status === 'checkout_pending' && booking.checkout_session_id) {
    return resumeCheckout(booking as CheckoutBooking)
  }
  return reserveAndCheckout(listing, guestId, booking.id, booking.check_in, booking.check_out)
}

async function reserveAndCheckout(
  listing: any, guestId: string, bookingId: string | null, checkIn: string, checkOut: string,
  input: Record<string, unknown> | null = null,
): Promise<Response> {
  const accountId = await getHostAccountId(listing.host_id)
  if (!accountId) return fail(409, 'This host has not set up payments yet.')
  const account = await stripeClient.v2.core.accounts.retrieve(accountId, { include: ['configuration.recipient'] })
  if (account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status !== 'active') {
    return fail(409, 'This host cannot receive payments yet.')
  }
  const amounts = calculateAmounts(listing, checkIn, checkOut)
  const holdInput = {
    p_guest: guestId, p_listing: listing.id, p_booking: bookingId, p_input: input,
    p_checkout: {
      destination: accountId, title: listing.title, client_url: clientUrl, nights: amounts.nights,
      nightly: amounts.nightlyCents, subtotal: amounts.subtotalCents, service_fee: amounts.serviceFeeCents,
      total: amounts.totalCents, application_fee: amounts.applicationFeeCents,
    },
  }
  let result = await supabase.rpc('reserve_booking_checkout', holdInput).single()
  if (result.error?.code === '23P01' && await releaseExpiredCheckouts(listing.id, checkIn, checkOut)) {
    result = await supabase.rpc('reserve_booking_checkout', holdInput).single()
  }
  const { data: booking, error } = result
  if (error) {
    if (error.code === '23P01') return fail(409, 'These dates are no longer available.')
    if (error.code === 'P0002') return fail(404, 'Booking awaiting payment not found.')
    if (error.code === 'P0001' || error.code === '22023') return fail(409, error.message)
    throw error
  }
  if (!booking) throw new Error('Checkout hold was not returned')
  return resumeCheckout(booking as CheckoutBooking)
}

async function releaseExpiredCheckouts(listingId: string, checkIn: string, checkOut: string): Promise<boolean> {
  const { data, error } = await supabase.from('bookings').select('checkout_session_id')
    .eq('listing_id', listingId).eq('status', 'checkout_pending')
    .lt('check_in', checkOut).gt('check_out', checkIn)
    .lte('checkout_expires_at', new Date().toISOString())
    .not('checkout_session_id', 'is', null).order('checkout_expires_at').limit(10)
  if (error) throw error
  let released = false
  for (const row of data ?? []) {
    const session = await stripeClient.checkout.sessions.retrieve(row.checkout_session_id)
    if (session.status === 'expired' && session.payment_status === 'unpaid') {
      await expireCheckout(session)
      released = true
    }
  }
  return released
}

async function resumeCheckout(booking: CheckoutBooking): Promise<Response> {
  if (booking.status !== 'checkout_pending') return fail(409, 'This checkout has expired. Start a new booking to try again.')
  const params = booking.checkout_params
  const path = `${params.client_url}/booking/${encodeURIComponent(booking.listing_id)}`
  const confirmation = `${path}/confirmation?session_id=`
  let session: Stripe.Checkout.Session
  if (booking.checkout_session_id) {
    session = await stripeClient.checkout.sessions.retrieve(booking.checkout_session_id)
    if (session.status === 'complete') return json({ url: confirmation + encodeURIComponent(session.id) })
    if (session.status === 'open' && session.url) return json({ url: session.url })
    if (session.status === 'expired') await expireCheckout(session)
    return fail(409, 'This checkout has expired. Start a new booking to try again.')
  }
  const expiresAt = Math.floor(new Date(booking.checkout_expires_at).getTime() / 1000)
  if (expiresAt <= Math.floor(Date.now() / 1000) + 30 * 60) {
    return fail(409, 'This checkout has expired. Start a new booking to try again.')
  }
  const cutoff = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium', timeStyle: 'long', timeZone: params.check_in_zone,
  }).format(new Date(booking.refund_cutoff_at))
  session = await stripeClient.checkout.sessions.create({
    mode: 'payment',
    adaptive_pricing: { enabled: false },
    customer_email: booking.guest_email,
    expires_at: expiresAt,
    custom_text: {
      submit: { message: `Full refund including fees until ${cutoff} (48 hours before check-in). After that, contact WaterBnB support.` },
    },
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: params.title },
          unit_amount: params.nightly,
        },
        quantity: params.nights,
      },
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'WaterBnB service fee' },
          unit_amount: params.service_fee,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: params.application_fee,
      transfer_data: {
        destination: params.destination,
      },
    },
    metadata: {
      booking_id: booking.id,
      listing_id: booking.listing_id,
      guest_id: booking.guest_id,
      checkout_hold: '1',
    },
    success_url: `${confirmation}{CHECKOUT_SESSION_ID}`,
    cancel_url: `${path}/payment?booking_id=${booking.id}&cancelled=1`,
  }, { idempotencyKey: `waterbnb-checkout-${booking.id}` })

  const { data: attached, error } = await supabase.from('bookings')
    .update({ checkout_session_id: session.id })
    .eq('id', booking.id).eq('status', 'checkout_pending')
    .or(`checkout_session_id.is.null,checkout_session_id.eq.${session.id}`)
    .select('id').maybeSingle()
  if (error) throw error
  if (!attached || !session.url) return fail(409, 'This checkout is no longer available.')
  return json({ url: session.url })
}

async function expireCheckout(session: Stripe.Checkout.Session) {
  if (session.metadata?.checkout_hold !== '1' || !session.metadata.booking_id) return
  const { error } = await supabase.from('bookings').update({ status: 'expired' })
    .eq('id', session.metadata.booking_id).eq('checkout_session_id', session.id).eq('status', 'checkout_pending')
  if (error) throw error
}

// --- Step 4b: finalize a paid session ----------------------------------------
// Persists everything a successful payment implies: the booking row, the
// host<->guest conversation (seeded with system messages), and notifications
// for both sides. Runs server-side and idempotently (unique constraints on
// bookings.booking_reference and conversations.booking_id), so it is safe to
// trigger from BOTH the Stripe webhook and the guest's redirect — whichever
// arrives first wins, and neither depends on the guest's browser surviving.
// deno-lint-ignore no-explicit-any
async function finalizePaidSession(session: any): Promise<{ booking: any; conversationId: string | null }> {
  const m = session.metadata ?? {}
  if (m.checkout_hold === '1') {
    const intentId = stripeObjectId(session.payment_intent)
    if (!intentId) throw new Error('Paid Checkout is missing its PaymentIntent')
    const { data, error } = await supabase.from('bookings').select('*')
      .eq('id', m.booking_id).eq('checkout_session_id', session.id).eq('guest_id', m.guest_id).maybeSingle()
    if (error) throw error
    if (!data || data.listing_id !== m.listing_id || session.currency !== 'usd' ||
        session.amount_total !== Number(data.checkout_params?.total)) {
      throw new Error('Paid Checkout does not match its booking hold')
    }
    if (data.stripe_payment_intent_id && data.stripe_payment_intent_id !== intentId) {
      throw new Error('Paid Checkout does not match the stored PaymentIntent')
    }
    const confirmed = await supabase.from('bookings')
      .update({ status: 'confirmed', stripe_payment_intent_id: intentId })
      .eq('id', data.id).eq('checkout_session_id', session.id).eq('status', 'checkout_pending')
      .select('*').maybeSingle()
    if (confirmed.error) throw confirmed.error
    if (confirmed.data) return openBookingConversation(confirmed.data)
    const current = await supabase.from('bookings').select('*')
      .eq('id', data.id).eq('stripe_payment_intent_id', intentId).maybeSingle()
    if (current.error) throw current.error
    if (current.data?.status === 'confirmed') return openBookingConversation(current.data)
    if (current.data?.status === 'cancelled') return { booking: current.data, conversationId: null }
    throw new Error('Paid Checkout no longer has a reservation; reconcile in Stripe')
  }

  // Already-issued Checkout URLs from before holds were introduced.
  const reference = 'WB' + String(session.id).slice(-8).toUpperCase()

  // 1. Booking — insert once per payment reference.
  let { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('booking_reference', reference)
    .maybeSingle()
  if (!booking) {
    if (m.booking_id) {
      const updated = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          booking_reference: reference,
          subtotal: Number(m.subtotal_cents) / 100,
          service_fee: Number(m.service_fee_cents) / 100,
          total: (session.amount_total ?? 0) / 100,
        })
        .eq('id', m.booking_id)
        .eq('status', 'approved_payment_pending')
        .select('*')
        .single()
      if (updated.error) throw new Error(`Could not confirm approved request: ${updated.error.message}`)
      booking = updated.data
    } else {
      const inserted = await supabase
        .from('bookings')
        .insert({
          listing_id: m.listing_id,
          guest_id: m.guest_id,
          check_in: m.check_in,
          check_out: m.check_out,
          guests: Number(m.guests),
          status: 'confirmed',
          guest_name: m.guest_name,
          guest_email: m.guest_email,
          guest_phone: m.guest_phone,
          special_requests: m.special_requests || null,
          subtotal: Number(m.subtotal_cents) / 100,
          service_fee: Number(m.service_fee_cents) / 100,
          total: (session.amount_total ?? 0) / 100,
          booking_reference: reference,
        })
        .select()
        .single()
      if (inserted.error) {
        if (inserted.error.code !== '23505') throw new Error(`Could not save booking: ${inserted.error.message}`)
        // Concurrent finalize (webhook + redirect) won the insert — reuse it.
        booking = (await supabase.from('bookings').select('*').eq('booking_reference', reference).maybeSingle()).data
      } else {
        booking = inserted.data
      }
    }
  }
  if (!booking) throw new Error('Booking could not be persisted')

  return openBookingConversation(booking)
}

async function openBookingConversation(booking: any) {
  const { data: listing } = await supabase.from('listings').select('*').eq('id', booking.listing_id).maybeSingle()
  if (!listing?.host_id) return { booking, conversationId: null }

  return await openConfirmedBooking(booking, listing)
}

// Creates the host<->guest conversation and confirmed notifications for an
// already-confirmed booking. Idempotent through conversations.booking_id.
// deno-lint-ignore no-explicit-any
async function openConfirmedBooking(booking: any, listing: any): Promise<{ booking: any; conversationId: string | null }> {
  const existing = await supabase.from('conversations').select('id').eq('booking_id', booking.id).maybeSingle()
  if (existing.data) return { booking, conversationId: existing.data.id }

  const created = await supabase
    .from('conversations')
    .insert({
      booking_id: booking.id,
      listing_id: listing.id,
      host_id: listing.host_id,
      guest_id: booking.guest_id,
    })
    .select('id')
    .single()
  if (created.error) {
    if (created.error.code !== '23505') throw new Error(`Could not create conversation: ${created.error.message}`)
    const again = await supabase.from('conversations').select('id').eq('booking_id', booking.id).maybeSingle()
    return { booking, conversationId: again.data?.id ?? null }
  }
  const conversationId = created.data.id as string

  // 3. Seed messages + notify both sides.
  const { data: hostProfile } = await supabase.from('host_profiles').select('name').eq('id', listing.host_id).maybeSingle()
  const hostName = hostProfile?.name || 'your host'
  const nights = Math.max(1, Math.round((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86_400_000))
  const nightsLabel = `${nights} night${nights === 1 ? '' : 's'}`
  const checkInLong = new Date(booking.check_in + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const checkOutLong = new Date(booking.check_out + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const seeds = [
    `Welcome aboard! This is your chat for ${listing.title}. ${booking.guest_name} and ${hostName} can use it to coordinate check-in, directions, and anything else about the stay.`,
    [
      `Booking details — ref ${booking.booking_reference}`,
      `⛵ ${listing.title}, ${listing.location}`,
      `📅 Check-in ${checkInLong} → check-out ${checkOutLong} (${nightsLabel})`,
      `👥 ${booking.guests} guest${booking.guests === 1 ? '' : 's'}`,
      booking.special_requests ? `📝 Special requests: ${booking.special_requests}` : null,
    ].filter(Boolean).join('\n'),
  ]
  const seeded = await supabase
    .from('messages')
    .insert(seeds.map(body => ({ conversation_id: conversationId, sender_id: 'system', body })))
  if (seeded.error) console.error('Could not seed conversation:', seeded.error.message)

  const notified = await supabase.from('notifications').insert([
    {
      user_id: listing.host_id,
      title: 'You have a new guest arriving! 🎉',
      body: `${booking.guest_name} booked ${listing.title} for ${nightsLabel}, checking in ${checkInLong}.`,
      link: `/messages/${conversationId}`,
    },
    {
      user_id: booking.guest_id,
      title: "Congrats! You're all set ⚓",
      body: `Your booking at ${listing.title} in ${listing.location} is confirmed for ${checkInLong}. Say hello to your host in chat!`,
      link: `/messages/${conversationId}`,
    },
  ])
  if (notified.error) console.error('Could not create notifications:', notified.error.message)

  return { booking, conversationId }
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd)
}

// Host accepts a pending request. This asks the guest to pay, and clears
// overlapping pending requests for the same listing so only one guest proceeds.
async function approveBooking(body: Record<string, unknown>, hostId: string): Promise<Response> {
  const { bookingId } = body as { bookingId?: string }
  if (!bookingId) return fail(400, 'bookingId is required')

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*, listing:listings!inner(*)')
    .eq('id', bookingId)
    .eq('status', 'pending')
    .eq('listing.host_id', hostId)
    .maybeSingle()
  if (error) throw new Error(`Could not load request: ${error.message}`)
  if (!booking) return fail(404, 'Pending booking request not found')

  const { data: approved, error: updateError } = await supabase
    .from('bookings')
    .update({ status: 'approved_payment_pending' })
    .eq('id', booking.id)
    .eq('status', 'pending')
    .select('*')
    .single()
  if (updateError) throw new Error(`Could not approve request: ${updateError.message}`)

  const { data: others } = await supabase
    .from('bookings')
    .select('*')
    .eq('listing_id', approved.listing_id)
    .eq('status', 'pending')

  const overlapping = (others ?? []).filter((b: any) =>
    b.id !== approved.id && rangesOverlap(approved.check_in, approved.check_out, b.check_in, b.check_out)
  )
  if (overlapping.length) {
    const ids = overlapping.map((b: any) => b.id)
    const declined = await supabase.from('bookings').update({ status: 'declined' })
      .in('id', ids).eq('status', 'pending').select('guest_id')
    if (declined.error) console.error('Could not decline overlapping requests:', declined.error.message)
    const notified = declined.data?.length && await supabase.from('notifications').insert(declined.data.map(b => ({
      user_id: b.guest_id,
      title: 'Booking request declined',
      body: `Your request for ${booking.listing.title} was not accepted because those dates are no longer available.`,
      link: '/trips',
    })))
    if (notified && notified.error) console.error('Could not notify declined guests:', notified.error.message)
  }

  const payLink = `/booking/${approved.listing_id}/payment?booking_id=${approved.id}`
  const notified = await supabase.from('notifications').insert([
    {
      user_id: approved.guest_id,
      title: 'Booking request approved',
      body: `Your request for ${booking.listing.title} was approved. Complete payment to confirm your booking.`,
      link: payLink,
    },
    {
      user_id: booking.listing.host_id,
      title: 'Request approved — awaiting payment',
      body: `${approved.guest_name} has been asked to pay for ${booking.listing.title}. The booking will confirm after payment.`,
      link: '/hosting',
    },
  ])
  if (notified.error) console.error('Could not create approval notifications:', notified.error.message)

  return json({ booking: approved, conversationId: null })
}

async function declineBooking(body: Record<string, unknown>, hostId: string): Promise<Response> {
  const { bookingId } = body as { bookingId?: string }
  if (!bookingId) return fail(400, 'bookingId is required')

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*, listing:listings!inner(*)')
    .eq('id', bookingId)
    .eq('status', 'pending')
    .eq('listing.host_id', hostId)
    .maybeSingle()
  if (error) throw new Error(`Could not load request: ${error.message}`)
  if (!booking) return fail(404, 'Pending booking request not found')

  const { data: declined, error: updateError } = await supabase
    .from('bookings')
    .update({ status: 'declined' })
    .eq('id', booking.id)
    .eq('status', 'pending')
    .select('*')
    .single()
  if (updateError) throw new Error(`Could not decline request: ${updateError.message}`)

  const notified = await supabase.from('notifications').insert({
    user_id: booking.guest_id,
    title: 'Booking request declined',
    body: `Your request for ${booking.listing.title} was declined by the host.`,
    link: '/trips',
  })
  if (notified.error) console.error('Could not notify declined guest:', notified.error.message)

  return json({ booking: declined })
}

async function setListingAutoApprove(body: Record<string, unknown>, hostId: string): Promise<Response> {
  const { listingId, enabled } = body as { listingId?: string; enabled?: boolean }
  if (!listingId || typeof enabled !== 'boolean') {
    return fail(400, 'listingId and enabled are required')
  }

  const { data: listing, error } = await supabase
    .from('listings')
    .update({ auto_approve_bookings: enabled })
    .eq('id', listingId)
    .eq('host_id', hostId)
    .select('id, title')
    .maybeSingle()
  if (error) throw new Error(`Could not update booking mode: ${error.message}`)
  if (!listing) return fail(404, 'Listing not found')

  if (enabled) {
    const { data: pending } = await supabase
      .from('bookings')
      .select('*')
      .eq('listing_id', listingId)
      .in('status', ['pending', 'approved_payment_pending'])
    if (pending?.length) {
      const ids = pending.map((b: any) => b.id)
      const declined = await supabase.from('bookings').update({ status: 'declined' })
        .in('id', ids).in('status', ['pending', 'approved_payment_pending']).select('guest_id')
      if (declined.error) console.error('Could not clear pending requests:', declined.error.message)
      const notified = declined.data?.length && await supabase.from('notifications').insert(declined.data.map(b => ({
        user_id: b.guest_id,
        title: 'Booking request declined',
        body: `Your pending request for ${listing.title} was closed because the host switched this listing to instant booking.`,
        link: '/trips',
      })))
      if (notified && notified.error) console.error('Could not notify cleared requests:', notified.error.message)
    }
  }

  return json({ ok: true })
}

// After Stripe redirects back, the app verifies the session was paid; the
// booking/conversation are finalized here too in case the webhook lost the race.
async function checkoutSession(body: Record<string, unknown>, guestId: string): Promise<Response> {
  const { sessionId } = body as { sessionId?: string }
  if (!sessionId) return fail(400, 'sessionId is required')

  const session = await stripeClient.checkout.sessions.retrieve(sessionId)
  if (session.mode !== 'payment' || !session.metadata?.listing_id || session.metadata.guest_id !== guestId) {
    return fail(404, 'Checkout session not found')
  }
  const paid = session.payment_status === 'paid'
  const finalized = paid ? await finalizePaidSession(session) : null
  return json({
    paid,
    amountTotal: session.amount_total,
    reference: finalized?.booking?.booking_reference ?? 'WB' + String(sessionId).slice(-8).toUpperCase(),
    booking: finalized?.booking ?? null,
    conversationId: finalized?.conversationId ?? null,
  })
}

async function webhook(req: Request): Promise<Response> {
  if (!webhookSecret) return fail(503, 'Webhook is not configured')
  const signature = req.headers.get('stripe-signature')
  if (!signature) return fail(400, 'Missing Stripe signature')
  let event: Stripe.Event
  try {
    event = await stripeClient.webhooks.constructEventAsync(
      await req.text(), signature, webhookSecret, undefined, stripeCrypto,
    )
  } catch {
    return fail(400, 'Invalid Stripe signature')
  }
  if (Boolean(event.livemode) !== live) return fail(400, 'Stripe event does not match this environment')
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded' ||
      event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
    const session = await stripeClient.checkout.sessions.retrieve(event.data.object.id)
    if (session.mode === 'payment' && session.payment_status === 'paid' && session.metadata?.listing_id && session.metadata.guest_id) {
      await finalizePaidSession(session)
    } else if (session.status === 'expired' || event.type === 'checkout.session.async_payment_failed') {
      await expireCheckout(session)
    }
  } else if (event.type === 'refund.created' || event.type === 'refund.updated' || event.type === 'refund.failed') {
    if (event.data.object.metadata?.waterbnb_booking_id) {
      await reconcileRefund(await stripeClient.refunds.retrieve(event.data.object.id))
    }
  }
  return json({ received: true })
}

function stripeObjectId(value: string | { id: string } | null | undefined): string | undefined {
  return typeof value === 'string' ? value : value?.id
}

async function reconcileRefund(refund: Stripe.Refund) {
  const bookingId = refund.metadata?.waterbnb_booking_id
  const intentId = stripeObjectId(refund.payment_intent)
  if (!bookingId || !intentId || refund.currency !== 'usd') return
  const status = refund.status === 'succeeded' ? 'succeeded'
    : refund.status === 'failed' || refund.status === 'canceled' ? 'failed' : 'pending'
  const { data, error } = await supabase.from('bookings').update({
    stripe_refund_id: refund.id,
    refund_status: status,
    ...(status === 'succeeded' ? { status: 'cancelled' } : {}),
  }).eq('id', bookingId).eq('stripe_payment_intent_id', intentId).eq('status', 'confirmed')
    .eq('total', refund.amount / 100)
    .in('refund_status', ['requested', 'pending'])
    .or(`stripe_refund_id.is.null,stripe_refund_id.eq.${refund.id}`)
    .select('status,refund_status').maybeSingle()
  if (error) throw error
  if (data) return data
  // Another request or event may have advanced it while we were at Stripe.
  const { data: existing, error: readError } = await supabase.from('bookings').select('status,refund_status')
    .eq('id', bookingId).eq('stripe_refund_id', refund.id).eq('stripe_payment_intent_id', intentId).maybeSingle()
  if (readError) throw readError
  return existing
}

async function cancelBooking(body: Record<string, unknown>, guestId: string): Promise<Response> {
  const { bookingId } = body
  if (typeof bookingId !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(bookingId)) {
    return fail(400, 'A valid bookingId is required')
  }
  const { data, error } = await supabase.rpc('claim_booking_refund', {
    p_booking: bookingId, p_guest: guestId,
  }).single()
  if (error?.code === 'P0002') return fail(404, 'Booking not found')
  if (error?.code === 'P0001') return fail(409, error.message)
  if (error) throw error
  const booking = data as RefundBooking
  if (booking.refund_status === 'succeeded' || booking.refund_status === 'failed') {
    return json({ status: booking.status, refundStatus: booking.refund_status })
  }
  let refund: Stripe.Refund | undefined
  try {
    if (booking.stripe_refund_id) {
      refund = await stripeClient.refunds.retrieve(booking.stripe_refund_id)
    } else if (Date.now() - Date.parse(booking.refund_requested_at) < 20 * 60 * 60 * 1000) {
      refund = await stripeClient.refunds.create({
        payment_intent: booking.stripe_payment_intent_id,
        amount: Math.round(Number(booking.total) * 100),
        reverse_transfer: true,
        refund_application_fee: true,
        metadata: { waterbnb_booking_id: booking.id },
      }, { idempotencyKey: `waterbnb-refund-${booking.id}` })
    } else {
      // Stripe may have forgotten the idempotency key. Look up the original,
      // but never start another money movement when its outcome is uncertain.
      for await (const candidate of stripeClient.refunds.list({ payment_intent: booking.stripe_payment_intent_id })) {
        if (candidate.metadata?.waterbnb_booking_id === booking.id) { refund = candidate; break }
      }
    }
  } catch (err) {
    console.error('Stripe refund needs reconciliation for booking', booking.id,
      err instanceof Stripe.errors.StripeError ? err.code : undefined)
    return fail(502, 'We could not confirm your refund. Your reservation remains active. Try again or contact support.')
  }
  const result = refund && await reconcileRefund(refund)
  if (!result) return fail(409, 'Your refund needs manual review. Contact support; your reservation remains active.')
  return json({ status: result.status, refundStatus: result.refund_status })
}

// --- Step 5: earnings --------------------------------------------------------
// Money data for the host dashboard, read live from Stripe. Transfers to the
// connected account are the host's earnings (destination charges route the
// host's share there); the balance shows what has not yet been paid out.
async function earnings(hostId: string): Promise<Response> {
  const accountId = await getHostAccountId(hostId)
  if (!accountId) return json({ hasAccount: false })

  const sumUsd = (amounts: Array<{ amount: number; currency: string }>) =>
    amounts.filter(a => a.currency === 'usd').reduce((s, a) => s + a.amount, 0)

  // Balance on the connected account + all transfers the platform sent it.
  // Payouts can fail for recipients without an external bank account yet, so
  // they degrade to an empty list instead of failing the whole request.
  const [balance, transfers, payouts] = await Promise.all([
    stripeClient.balance.retrieve({}, { stripeAccount: accountId }),
    stripeClient.transfers.list({ destination: accountId, limit: 100 }),
    stripeClient.payouts.list({ limit: 20 }, { stripeAccount: accountId }).catch(() => ({ data: [] })),
  ])

  return json({
    hasAccount: true,
    accountId,
    // Cents. available = payable now; pending = settling.
    availableCents: sumUsd(balance.available ?? []),
    pendingCents: sumUsd(balance.pending ?? []),
    lifetimeCents: transfers.data.reduce((s, t) => s + (t.amount_reversed ? t.amount - t.amount_reversed : t.amount), 0),
    transfers: transfers.data.map(t => ({
      id: t.id,
      amountCents: t.amount,
      created: t.created, // unix seconds
      description: t.description ?? null,
      reversed: t.reversed,
    })),
    payouts: payouts.data.map(p => ({
      id: p.id,
      amountCents: p.amount,
      created: p.created,
      arrivalDate: p.arrival_date,
      status: p.status,
    })),
  })
}

// --- Router -----------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') return fail(405, 'Use POST')

  // Sub-path after the function name, e.g. /payments/checkout -> "checkout".
  const route = new URL(req.url).pathname.split('/').filter(Boolean).pop()
  try {
    if (route === 'webhook') return await webhook(req)
    const userId = await verifiedUserId(req)
    if (!userId) return fail(401, 'Sign in to continue')
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, 'Expected a JSON object')
    switch (route) {
      case 'connect-account':
        return await connectAccount(body, userId)
      case 'onboarding-link':
        return await onboardingLink(userId)
      case 'connect-status':
        return await connectStatus(userId)
      case 'booking-request':
        return await bookingRequest(body, userId)
      case 'checkout':
        return await checkout(body, userId)
      case 'approved-request-checkout':
        return await approvedRequestCheckout(body, userId)
      case 'checkout-booking':
        return await checkoutBooking(body, userId)
      case 'checkout-session':
        return await checkoutSession(body, userId)
      case 'approve-booking':
        return await approveBooking(body, userId)
      case 'decline-booking':
        return await declineBooking(body, userId)
      case 'cancel-booking':
        return await cancelBooking(body, userId)
      case 'listing-auto-approve':
        return await setListingAutoApprove(body, userId)
      case 'earnings':
        return await earnings(userId)
      default:
        return fail(404, `Unknown route: ${route}`)
    }
  } catch (err) {
    console.error(`payments/${route} failed:`, err)
    return fail(500, 'Payment operation failed')
  }
})
