// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  jwtVerify: vi.fn(),
  constructEvent: vi.fn(),
  retrieve: vi.fn(),
  createSession: vi.fn(),
  retrieveAccount: vi.fn(),
  createRefund: vi.fn(),
  retrieveRefund: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  serve: vi.fn<(handler: (req: Request) => Promise<Response>) => void>(),
}))

vi.mock('npm:jose@5', () => ({
  createRemoteJWKSet: () => vi.fn(),
  jwtVerify: mocks.jwtVerify,
}))
vi.mock('npm:@supabase/supabase-js@2', () => ({
  createClient: () => ({ from: mocks.from, rpc: mocks.rpc }),
}))
vi.mock('npm:stripe@22', () => ({
  default: class {
    static createSubtleCryptoProvider() { return {} }
    static errors = { StripeError: class extends Error {} }
    webhooks = { constructEventAsync: mocks.constructEvent }
    checkout = { sessions: { retrieve: mocks.retrieve, create: mocks.createSession } }
    v2 = { core: { accounts: { retrieve: mocks.retrieveAccount } } }
    refunds = { create: mocks.createRefund, retrieve: mocks.retrieveRefund }
  },
}))

const origin = 'https://waterbnb.example'
const issuer = 'https://clerk.waterbnb.example'
const webhookSecret = 'test-signing-secret'

function post(route: string, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return mocks.serve.mock.calls[0][0](new Request(`${origin}/payments/${route}`, {
    method: 'POST', body: JSON.stringify(body), headers,
  }))
}

function query(data: unknown = null, error: { code: string; message?: string } | null = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    single: vi.fn().mockResolvedValue({ data, error }),
  }
  mocks.from.mockReturnValue(chain)
  return chain
}

const signedIn = { 'x-clerk-token': 'clerk-session' }

beforeAll(async () => {
  const config: Record<string, string> = {
    CLIENT_URL: origin, CLERK_ISSUER: issuer,
    STRIPE_SECRET_KEY: 'test-api-key', STRIPE_CHECKOUT_WEBHOOK_SECRET: webhookSecret,
  }
  vi.stubGlobal('Deno', { env: { get: (key: string) => config[key] }, serve: mocks.serve })
  await import('../functions/payments/index.ts')
})

afterAll(() => vi.unstubAllGlobals())

beforeEach(() => {
  for (const mock of [
    mocks.jwtVerify, mocks.constructEvent, mocks.retrieve, mocks.from, mocks.rpc,
    mocks.createSession, mocks.retrieveAccount, mocks.createRefund, mocks.retrieveRefund,
  ]) mock.mockReset()
  mocks.jwtVerify.mockResolvedValue({ payload: { sub: 'verified-user', azp: origin, sid: 'session' } })
})

describe('payment route authorization', () => {
  it('rejects missing, invalid, and wrong-origin Clerk credentials before querying payment data', async () => {
    expect((await post('earnings', {})).status).toBe(401)
    mocks.jwtVerify.mockRejectedValueOnce(new Error('Invalid token'))
    expect((await post('earnings', {}, signedIn)).status).toBe(401)
    mocks.jwtVerify.mockResolvedValueOnce({ payload: { sub: 'verified-user', sid: 'session', azp: 'https://other.example' } })
    expect((await post('earnings', {}, signedIn)).status).toBe(401)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it.each([
    ['approve-booking', 'listing.host_id'],
    ['decline-booking', 'listing.host_id'],
    ['approved-request-checkout', 'guest_id'],
    ['checkout-booking', 'guest_id'],
    ['listing-auto-approve', 'host_id'],
  ])('scopes %s to the verified actor', async (route, ownerField) => {
    const chain = query()
    expect((await post(route, {
      bookingId: 'booking', listingId: 'listing', enabled: true, hostId: 'other-user', guestId: 'other-user',
    }, signedIn)).status).toBe(404)
    expect(chain.eq).toHaveBeenCalledWith(ownerField, 'verified-user')
  })

  it('reads only the signed-in host’s Connect account', async () => {
    const chain = query()
    expect((await post('earnings', { hostId: 'other-user' }, signedIn)).status).toBe(200)
    expect(chain.eq).toHaveBeenCalledWith('id', 'verified-user')
  })

  it('does not expose or finalize another guest’s Checkout session', async () => {
    mocks.retrieve.mockResolvedValue({
      mode: 'payment', payment_status: 'paid', metadata: { listing_id: 'listing', guest_id: 'other-user' },
    })
    const res = await post('checkout-session', { sessionId: 'cs_test', guestId: 'other-user' }, signedIn)
    expect(res.status).toBe(404)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('returns only the status and booking fields for the guest who owns the session', async () => {
    mocks.retrieve.mockResolvedValue({
      mode: 'payment', payment_status: 'unpaid', amount_total: 1000,
      metadata: { listing_id: 'listing', guest_id: 'verified-user', guest_email: 'guest@example.test' },
    })
    const res = await post('checkout-session', { sessionId: 'cs_test' }, signedIn)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      paid: false, amountTotal: 1000, reference: 'WBCS_TEST', booking: null, conversationId: null,
    })
  })
})

describe('Stripe webhook', () => {
  const event = { type: 'checkout.session.async_payment_succeeded', data: { object: { id: 'cs_test' } } }
  const headers = { 'stripe-signature': 'signature' }

  it('rejects deliveries without a valid Stripe signature before querying Stripe or the database', async () => {
    expect((await post('webhook', event)).status).toBe(400)
    mocks.constructEvent.mockRejectedValueOnce(new Error('Invalid signature'))
    expect((await post('webhook', event, headers)).status).toBe(400)
    expect(mocks.retrieve).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('passes the untouched body to Stripe and processes a verified delayed payment without a Clerk token', async () => {
    const rawBody = JSON.stringify(event, null, 2) + '\n'
    mocks.constructEvent.mockResolvedValue(event)
    mocks.retrieve.mockResolvedValue({
      id: 'cs_test', mode: 'payment', payment_status: 'paid',
      metadata: { listing_id: 'listing', guest_id: 'guest' },
    })
    const bookingQuery = query({ id: 'booking', listing_id: 'listing' })
    mocks.from.mockReturnValueOnce(bookingQuery).mockReturnValue(query())
    const res = await mocks.serve.mock.calls[0][0](new Request(`${origin}/payments/webhook`, {
      method: 'POST', headers, body: rawBody,
    }))
    expect(res.status).toBe(200)
    expect(mocks.constructEvent).toHaveBeenCalledWith(rawBody, 'signature', webhookSecret, undefined, expect.anything())
    expect(mocks.retrieve).toHaveBeenCalledWith('cs_test')
    expect(mocks.from).toHaveBeenCalledWith('bookings')
  })

  it.each(['checkout.session.expired', 'checkout.session.async_payment_failed'])(
    'releases only the matching unpaid hold on %s',
    async type => {
      const event = { type, data: { object: { id: 'cs_test' } } }
      mocks.constructEvent.mockResolvedValue(event)
      mocks.retrieve.mockResolvedValue({
        id: 'cs_test', mode: 'payment', status: type.endsWith('expired') ? 'expired' : 'complete',
        payment_status: 'unpaid', metadata: { checkout_hold: '1', booking_id: bookingId },
      })
      const hold = query()
      expect((await post('webhook', event, headers)).status).toBe(200)
      expect(hold.update).toHaveBeenCalledWith({ status: 'expired' })
      expect(hold.eq.mock.calls).toEqual([
        ['id', bookingId], ['checkout_session_id', 'cs_test'], ['status', 'checkout_pending'],
      ])
    },
  )

  it('reconciles a verified refund update without releasing dates for a failed refund', async () => {
    const event = { type: 'refund.failed', data: { object: refund('failed') } }
    mocks.constructEvent.mockResolvedValue(event)
    mocks.retrieveRefund.mockResolvedValue(refund('failed'))
    const booking = query({ status: 'confirmed', refund_status: 'failed' })
    expect((await post('webhook', event, headers)).status).toBe(200)
    expect(booking.update).toHaveBeenCalledWith({ stripe_refund_id: 're_test', refund_status: 'failed' })
  })

  it('keeps an unpaid completed Checkout reserved while payment is processing', async () => {
    const event = { type: 'checkout.session.completed', data: { object: { id: 'cs_test' } } }
    mocks.constructEvent.mockResolvedValue(event)
    mocks.retrieve.mockResolvedValue({ id: 'cs_test', mode: 'payment', status: 'complete', payment_status: 'unpaid' })
    expect((await post('webhook', event, headers)).status).toBe(200)
    expect(mocks.from).not.toHaveBeenCalled()
  })
})

const bookingId = '11111111-1111-4111-8111-111111111111'
const checkoutBody = {
  listingId: 'listing', checkIn: '2034-06-10', checkOut: '2034-06-11', guests: 1,
  guestDetails: { email: 'guest@example.test' },
}
const heldBooking = {
  id: bookingId, listing_id: 'listing', guest_id: 'verified-user', status: 'checkout_pending',
  guest_email: 'guest@example.test', checkout_expires_at: '2034-06-10T00:45:00Z',
  refund_cutoff_at: '2034-06-08T20:00:00Z',
  checkout_params: {
    client_url: origin, title: 'Houseboat', check_in_zone: 'America/New_York',
    nightly: 10000, nights: 1, service_fee: 1200, total: 11200, application_fee: 1555, destination: 'acct_test',
  },
}

function mockCheckoutLookup() {
  const listing = query({ id: 'listing', host_id: 'host', capacity: 2, price_per_night: 100, title: 'Houseboat' })
  const host = query({ stripe_account_id: 'acct_test' })
  mocks.from.mockReturnValueOnce(listing).mockReturnValueOnce(host)
  mocks.retrieveAccount.mockResolvedValue({
    configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: 'active' } } } } },
  })
}

describe('checkout holds', () => {
  it('does not create a Checkout session when the database rejects an overlapping reservation', async () => {
    const expired = query([])
    mockCheckoutLookup()
    mocks.from.mockReturnValueOnce(expired)
    mocks.rpc.mockReturnValue(query(null, { code: '23P01' }))
    expect((await post('checkout', checkoutBody, signedIn)).status).toBe(409)
    expect(mocks.createSession).not.toHaveBeenCalled()
  })

  it('creates Checkout with the held quote and returns a URL only after attaching the session', async () => {
    mockCheckoutLookup()
    const attach = query({ id: bookingId })
    mocks.from.mockReturnValueOnce(attach)
    mocks.rpc.mockReturnValue(query(heldBooking))
    mocks.createSession.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.com/test' })
    const res = await post('checkout', checkoutBody, signedIn)
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/test' })
    expect(mocks.createSession).toHaveBeenCalledWith(expect.objectContaining({
      expires_at: Date.parse(heldBooking.checkout_expires_at) / 1000,
      metadata: { booking_id: bookingId, listing_id: 'listing', guest_id: 'verified-user', checkout_hold: '1' },
    }), { idempotencyKey: `waterbnb-checkout-${bookingId}` })
    expect(attach.update).toHaveBeenCalledWith({ checkout_session_id: 'cs_test' })
  })

  it('resumes an attached session without creating a second charge opportunity', async () => {
    query({ ...heldBooking, listing: { host_id: 'host' }, checkout_session_id: 'cs_test' })
    mocks.retrieve.mockResolvedValue({ id: 'cs_test', status: 'open', url: 'https://checkout.stripe.com/test' })
    const response = await post('approved-request-checkout', { bookingId }, signedIn)
    expect(await response.json()).toEqual({ url: 'https://checkout.stripe.com/test' })
    expect(mocks.createSession).not.toHaveBeenCalled()
  })

  it('does not disclose a Stripe URL when the hold expired before the session could be attached', async () => {
    mockCheckoutLookup()
    const expiredHold = query()
    mocks.from.mockReturnValueOnce(expiredHold)
    mocks.rpc.mockReturnValue(query(heldBooking))
    mocks.createSession.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.com/test' })
    const response = await post('checkout', checkoutBody, signedIn)
    expect(response.status).toBe(409)
    expect(await response.json()).not.toHaveProperty('url')
  })

  it('returns the already-confirmed booking on a duplicate paid delivery', async () => {
    const booking = { ...heldBooking, stripe_payment_intent_id: 'pi_test', status: 'confirmed' }
    mocks.retrieve.mockResolvedValue({
      id: 'cs_test', mode: 'payment', payment_status: 'paid', amount_total: 11200, currency: 'usd',
      payment_intent: 'pi_test',
      metadata: { booking_id: bookingId, listing_id: 'listing', guest_id: 'verified-user', checkout_hold: '1' },
    })
    const matched = query(booking)
    const transition = query()
    mocks.from.mockReturnValueOnce(matched).mockReturnValueOnce(transition).mockReturnValueOnce(matched)
    mocks.from.mockReturnValue(query())
    const res = await post('checkout-session', { sessionId: 'cs_test' }, signedIn)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ paid: true, booking: { id: bookingId, status: 'confirmed' } })
    expect(transition.eq).toHaveBeenCalledWith('status', 'checkout_pending')
  })
})

function refund(status: string) {
  return {
    id: 're_test', status, amount: 11200, currency: 'usd', payment_intent: 'pi_test',
    metadata: { waterbnb_booking_id: bookingId },
  }
}

describe('guest refunds', () => {
  it('cannot refund a booking the database did not claim for the verified guest', async () => {
    mocks.rpc.mockReturnValue(query(null, { code: 'P0002' }))
    const response = await post('cancel-booking', { bookingId, guestId: 'other-user' }, signedIn)
    expect(response.status).toBe(404)
    expect(mocks.rpc).toHaveBeenCalledWith('claim_booking_refund', { p_booking: bookingId, p_guest: 'verified-user' })
    expect(mocks.createRefund).not.toHaveBeenCalled()
  })

  it('does not reopen the dates when Stripe cannot reverse the host transfer after payout', async () => {
    mocks.rpc.mockReturnValue(query({
      id: bookingId, total: 112, status: 'confirmed', refund_status: 'requested',
      refund_requested_at: new Date().toISOString(), stripe_payment_intent_id: 'pi_test',
    }))
    mocks.createRefund.mockRejectedValue(new Error('Insufficient connected account balance'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const response = await post('cancel-booking', { bookingId }, signedIn)
      expect(response.status).toBe(502)
      expect(await response.json()).toMatchObject({ error: expect.stringContaining('reservation remains active') })
      expect(mocks.from).not.toHaveBeenCalled()
    } finally {
      log.mockRestore()
    }
  })

  it('reads the original Stripe refund on retry instead of creating another refund', async () => {
    const booking = query({ status: 'cancelled', refund_status: 'succeeded' })
    mocks.rpc.mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: {
        id: bookingId, refund_status: 'pending', stripe_refund_id: 're_test',
      } }),
    })
    mocks.retrieveRefund.mockResolvedValue(refund('succeeded'))
    const response = await post('cancel-booking', { bookingId }, signedIn)
    expect(await response.json()).toEqual({ status: 'cancelled', refundStatus: 'succeeded' })
    expect(mocks.retrieveRefund).toHaveBeenCalledWith('re_test')
    expect(mocks.createRefund).not.toHaveBeenCalled()
    expect(booking.update).toHaveBeenCalledOnce()
  })

  it.each(['succeeded', 'pending', 'failed'])('reverses the transfer, refunds fees, and handles %s safely', async status => {
    const booking = query({ status: status === 'succeeded' ? 'cancelled' : 'confirmed', refund_status: status })
    mocks.rpc.mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: {
        id: bookingId, total: 112, status: 'confirmed', refund_status: 'requested',
        refund_requested_at: new Date().toISOString(), stripe_payment_intent_id: 'pi_test',
      } }),
    })
    mocks.createRefund.mockResolvedValue(refund(status))
    const response = await post('cancel-booking', { bookingId }, signedIn)
    expect(await response.json()).toEqual({ status: status === 'succeeded' ? 'cancelled' : 'confirmed', refundStatus: status })
    expect(mocks.createRefund).toHaveBeenCalledWith({
      payment_intent: 'pi_test', amount: 11200, reverse_transfer: true, refund_application_fee: true,
      metadata: { waterbnb_booking_id: bookingId },
    }, { idempotencyKey: `waterbnb-refund-${bookingId}` })
    expect(booking.update).toHaveBeenCalledWith({
      stripe_refund_id: 're_test', refund_status: status, ...(status === 'succeeded' ? { status: 'cancelled' } : {}),
    })
  })
})
