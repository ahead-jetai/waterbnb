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
 *   /connect-account   { hostId, name, email }        -> { accountId }
 *   /onboarding-link   { hostId }                     -> { url }
 *   /connect-status    { hostId }                     -> { hasAccount, ... }
 *   /create-product    { listingId }                  -> { productId }
 *   /checkout          { listingId, guestId, ... }    -> { url }
 *   /checkout-session  { sessionId }                  -> { paid, booking, conversationId, ... }
 *   /webhook           Stripe event (checkout.session.completed)
 *   /earnings          { hostId }                     -> { hasAccount, balance, transfers, ... }
 *
 * Required secrets (Dashboard -> Edge Functions -> Secrets, or `supabase secrets set`):
 *   STRIPE_SECRET_KEY  — your sk_/rk_ key. Never expose to the browser.
 *   CLIENT_URL         — where the SPA runs (e.g. http://localhost:5173).
 * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.
 */
import Stripe from 'npm:stripe@22'
import { createClient } from 'npm:@supabase/supabase-js@2'

// --- Step 0: configuration, failing fast with helpful errors -------------

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY secret. Set it with: supabase secrets set STRIPE_SECRET_KEY=sk_...')
}

// One Stripe client for ALL requests. The SDK pins the latest API version
// (2026-06-24.dahlia at the time of writing) automatically.
const stripeClient = new Stripe(stripeSecretKey)

// Service-role client: the function is trusted backend code.
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Where the SPA runs; used for Checkout/onboarding redirect URLs.
const clientUrl = Deno.env.get('CLIENT_URL') ?? 'http://localhost:5173'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
async function connectAccount(body: Record<string, unknown>): Promise<Response> {
  const { hostId, name, email } = body as { hostId?: string; name?: string; email?: string }
  if (!hostId || !email) return fail(400, 'hostId and email are required')

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
async function onboardingLink(body: Record<string, unknown>): Promise<Response> {
  const { hostId } = body as { hostId?: string }
  if (!hostId) return fail(400, 'hostId is required')

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
async function connectStatus(body: Record<string, unknown>): Promise<Response> {
  const { hostId } = body as { hostId?: string }
  if (!hostId) return fail(400, 'hostId is required')

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

// --- Step 3: products -------------------------------------------------------
// Each listing becomes a *platform-level* Stripe Product (not created on the
// connected account). The product's metadata carries the listing ->
// connected-account mapping, and the product id is also stored on the listing.
// deno-lint-ignore no-explicit-any
async function ensureProductForListing(listing: any): Promise<string> {
  if (listing.stripe_product_id) return listing.stripe_product_id

  const accountId = listing.host_id ? await getHostAccountId(listing.host_id) : null

  const product = await stripeClient.products.create({
    name: listing.title,
    description: `${listing.location} — book on WaterBnB`,
    // default_price_data gives the product a nightly base price…
    default_price_data: {
      unit_amount: Math.round(Number(listing.price_per_night) * 100),
      currency: 'usd',
    },
    // …and metadata records which listing/host/account this product maps to.
    metadata: {
      listing_id: listing.id,
      host_id: listing.host_id ?? '',
      connected_account_id: accountId ?? '',
    },
  })

  const { error } = await supabase
    .from('listings')
    .update({ stripe_product_id: product.id })
    .eq('id', listing.id)
  if (error) console.error('Could not store product id on listing:', error.message)

  return product.id
}

async function createProduct(body: Record<string, unknown>): Promise<Response> {
  const { listingId } = body as { listingId?: string }
  if (!listingId) return fail(400, 'listingId is required')

  const { data: listing, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .maybeSingle()
  if (error || !listing) return fail(404, 'Listing not found')

  const productId = await ensureProductForListing(listing)
  return json({ productId })
}

// --- Step 4: checkout -------------------------------------------------------
// Guests pay through Stripe hosted Checkout. This is a destination charge:
// the full amount is charged by the platform, the host's share flows to
// their connected account, and WaterBnB retains the service fee plus the
// estimated processing fee via application_fee_amount.
async function checkout(body: Record<string, unknown>): Promise<Response> {
  const { listingId, guestId, checkIn, checkOut, guests, guestDetails } = body as {
    listingId?: string
    guestId?: string
    checkIn?: string
    checkOut?: string
    guests?: number
    guestDetails?: { name?: string; email?: string; phone?: string; specialRequests?: string }
  }
  if (!listingId || !guestId || !checkIn || !checkOut || !guests || !guestDetails?.email) {
    return fail(400, 'listingId, guestId, checkIn, checkOut, guests, and guestDetails are required')
  }

  const { data: listing, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .maybeSingle()
  if (error || !listing) return fail(404, 'Listing not found')
  if (!listing.host_id) return fail(400, 'This listing has no host to pay')

  const accountId = await getHostAccountId(listing.host_id)
  if (!accountId) {
    return fail(409, 'This host has not set up payments yet. Please try another listing.')
  }

  // Server-side price computation — never trust amounts from the browser.
  const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000)
  if (nights <= 0) return fail(400, 'checkOut must be after checkIn')
  const nightlyCents = Math.round(Number(listing.price_per_night) * 100)
  const subtotalCents = nightlyCents * nights
  const serviceFeeCents = Math.round(subtotalCents * 0.12) // WaterBnB's 12% cut
  const totalCents = subtotalCents + serviceFeeCents
  // Estimated Stripe processing fee (US card: 2.9% + 30¢). Included in the
  // application fee so the host bears it and WaterBnB nets its full 12%:
  // host receives subtotal − Stripe fee, platform keeps the service fee.
  const stripeFeeCents = Math.round(totalCents * 0.029) + 30
  const applicationFeeCents = serviceFeeCents + stripeFeeCents

  const productId = await ensureProductForListing(listing)

  const session = await stripeClient.checkout.sessions.create({
    mode: 'payment',
    customer_email: guestDetails.email,
    line_items: [
      {
        // Nightly rate × nights, tied to the listing's platform product.
        price_data: {
          currency: 'usd',
          product: productId,
          unit_amount: nightlyCents,
        },
        quantity: nights,
      },
      {
        // The guest-facing service fee as its own line item.
        price_data: {
          currency: 'usd',
          product_data: { name: 'WaterBnB service fee' },
          unit_amount: serviceFeeCents,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      // Destination charge: platform keeps service fee + processing fee,
      // host gets the rest (subtotal − Stripe fee).
      application_fee_amount: applicationFeeCents,
      transfer_data: {
        destination: accountId,
      },
    },
    // Everything needed to persist the booking after payment.
    metadata: {
      listing_id: listingId,
      guest_id: guestId,
      check_in: checkIn,
      check_out: checkOut,
      guests: String(guests),
      guest_name: guestDetails.name ?? '',
      guest_email: guestDetails.email,
      guest_phone: guestDetails.phone ?? '',
      special_requests: guestDetails.specialRequests ?? '',
      subtotal_cents: String(subtotalCents),
      service_fee_cents: String(serviceFeeCents),
      stripe_fee_cents: String(stripeFeeCents),
      host_net_cents: String(totalCents - applicationFeeCents),
    },
    success_url: `${clientUrl}/booking/${listingId}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl}/booking/${listingId}/payment?cancelled=1`,
  })

  return json({ url: session.url })
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
  const reference = 'WB' + String(session.id).slice(-8).toUpperCase()

  // 1. Booking — insert once per payment reference.
  let { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('booking_reference', reference)
    .maybeSingle()
  if (!booking) {
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
  if (!booking) throw new Error('Booking could not be persisted')

  // 2. Conversation — one per booking, seeded only by whoever creates it.
  const { data: listing } = await supabase.from('listings').select('*').eq('id', booking.listing_id).maybeSingle()
  if (!listing?.host_id) return { booking, conversationId: null }

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

// After Stripe redirects back, the app verifies the session was paid; the
// booking/conversation are finalized here too in case the webhook lost the race.
async function checkoutSession(body: Record<string, unknown>): Promise<Response> {
  const { sessionId } = body as { sessionId?: string }
  if (!sessionId) return fail(400, 'sessionId is required')

  const session = await stripeClient.checkout.sessions.retrieve(sessionId)
  const paid = session.payment_status === 'paid'
  const finalized = paid ? await finalizePaidSession(session) : null
  return json({
    paid,
    amountTotal: session.amount_total,
    metadata: session.metadata,
    reference: 'WB' + String(sessionId).slice(-8).toUpperCase(),
    booking: finalized?.booking ?? null,
    conversationId: finalized?.conversationId ?? null,
  })
}

// Stripe webhook: finalizes the booking even if the guest never returns to
// the app. The payload is treated as an untrusted hint — we only take the
// session id from it and re-fetch the session from Stripe's API, so a forged
// event cannot inject data (it can only ask us to finalize a genuinely paid
// session, which is idempotent and harmless).
async function webhook(body: Record<string, unknown>): Promise<Response> {
  // deno-lint-ignore no-explicit-any
  const event = body as any
  if (event?.type === 'checkout.session.completed' && event?.data?.object?.id) {
    const session = await stripeClient.checkout.sessions.retrieve(String(event.data.object.id))
    if (session.payment_status === 'paid') await finalizePaidSession(session)
  }
  return json({ received: true })
}

// --- Step 5: earnings --------------------------------------------------------
// Money data for the host dashboard, read live from Stripe. Transfers to the
// connected account are the host's earnings (destination charges route the
// host's share there); the balance shows what has not yet been paid out.
async function earnings(body: Record<string, unknown>): Promise<Response> {
  const { hostId } = body as { hostId?: string }
  if (!hostId) return fail(400, 'hostId is required')

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
  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    // empty body is fine for some routes; validation happens per-route
  }

  try {
    switch (route) {
      case 'connect-account':
        return await connectAccount(body)
      case 'onboarding-link':
        return await onboardingLink(body)
      case 'connect-status':
        return await connectStatus(body)
      case 'create-product':
        return await createProduct(body)
      case 'checkout':
        return await checkout(body)
      case 'checkout-session':
        return await checkoutSession(body)
      case 'webhook':
        return await webhook(body)
      case 'earnings':
        return await earnings(body)
      default:
        return fail(404, `Unknown route: ${route}`)
    }
  } catch (err) {
    console.error(`payments/${route} failed:`, err)
    return fail(500, err instanceof Error ? err.message : 'Payment operation failed')
  }
})
