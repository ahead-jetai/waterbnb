// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  jwtVerify: vi.fn(),
  constructEvent: vi.fn(),
  retrieve: vi.fn(),
  from: vi.fn(),
  serve: vi.fn<(handler: (req: Request) => Promise<Response>) => void>(),
}))

vi.mock('npm:jose@5', () => ({
  createRemoteJWKSet: () => vi.fn(),
  jwtVerify: mocks.jwtVerify,
}))
vi.mock('npm:@supabase/supabase-js@2', () => ({
  createClient: () => ({ from: mocks.from }),
}))
vi.mock('npm:stripe@22', () => ({
  default: class {
    static createSubtleCryptoProvider() { return {} }
    webhooks = { constructEventAsync: mocks.constructEvent }
    checkout = { sessions: { retrieve: mocks.retrieve } }
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

function query(data: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
  }
  mocks.from.mockReturnValue(chain)
  return chain
}

const signedIn = { 'x-clerk-token': 'clerk-session' }

beforeAll(async () => {
  const config: Record<string, string> = {
    CLIENT_URL: origin, CLERK_ISSUER: issuer,
    STRIPE_SECRET_KEY: 'test-api-key', STRIPE_WEBHOOK_SECRET: webhookSecret,
  }
  vi.stubGlobal('Deno', { env: { get: (key: string) => config[key] }, serve: mocks.serve })
  await import('../functions/payments/index.ts')
})

afterAll(() => vi.unstubAllGlobals())

beforeEach(() => {
  for (const mock of [mocks.jwtVerify, mocks.constructEvent, mocks.retrieve, mocks.from]) mock.mockReset()
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
})
