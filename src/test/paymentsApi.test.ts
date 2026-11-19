import { beforeEach, describe, expect, it, vi } from 'vitest'
import { approveBookingRequest, fetchCheckoutSession } from '../utils/paymentsApi'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('../utils/supabase', () => ({ supabase: { functions: { invoke } } }))

describe('payments client', () => {
  beforeEach(() => invoke.mockReset())

  it('sends the current Clerk token instead of a caller ID', async () => {
    invoke.mockResolvedValue({ data: {} })
    await approveBookingRequest(async () => 'session-token', 'booking-id')
    expect(invoke).toHaveBeenCalledWith('payments/approve-booking', {
      body: { bookingId: 'booking-id' },
      headers: { 'x-clerk-token': 'session-token' },
    })
  })

  it('does not look up a Checkout session when signed out', async () => {
    await expect(fetchCheckoutSession(async () => null, 'cs_test')).rejects.toThrow('Sign in')
    expect(invoke).not.toHaveBeenCalled()
  })
})
