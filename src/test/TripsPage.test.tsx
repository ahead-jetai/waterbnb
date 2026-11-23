import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import TripsPage from '../pages/TripsPage'
import type { Booking } from '../bookingTypes'

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(async () => 'clerk-session'),
  fetchGuestBookings: vi.fn(),
  cancelBooking: vi.fn(),
  user: { id: 'guest' },
}))
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: mocks.getToken }),
  useUser: () => ({ user: mocks.user }),
}))
vi.mock('../utils/bookingsApi', () => ({ fetchGuestBookings: mocks.fetchGuestBookings }))
vi.mock('../utils/paymentsApi', () => ({ cancelBooking: mocks.cancelBooking }))

const booking: Booking = {
  id: 'booking', listingId: 'listing', guestId: 'guest', status: 'confirmed',
  checkIn: '2099-06-10', checkOut: '2099-06-11', guests: 1,
  guestDetails: { name: 'Guest', email: 'guest@example.test', phone: '' },
  subtotal: 100, serviceFee: 12, total: 112, bookingReference: 'WBTEST',
  createdAt: '2099-01-01T00:00:00Z', refundCutoffAt: '2099-06-08T19:00:00Z',
}

afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks() })

it('keeps a trip upcoming while the refund is pending, and shows it cancelled only after success', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  mocks.fetchGuestBookings.mockResolvedValue([booking])
  mocks.cancelBooking
    .mockResolvedValueOnce({ status: 'confirmed', refundStatus: 'pending' })
    .mockResolvedValueOnce({ status: 'cancelled', refundStatus: 'succeeded' })
  const user = userEvent.setup()
  render(<MemoryRouter><TripsPage /></MemoryRouter>)

  await user.click(await screen.findByRole('button', { name: 'Cancel booking for a full refund' }))
  expect(await screen.findByText(/reservation remains active/i)).toBeVisible()
  expect(mocks.cancelBooking).toHaveBeenCalledWith(mocks.getToken, 'booking')

  await user.click(screen.getByRole('button', { name: 'Check refund status' }))
  expect(await screen.findByText('Full refund issued.')).toBeVisible()
  expect(screen.getByText('Cancelled')).toBeVisible()
})

it('directs a booking that missed the refund cutoff to support', async () => {
  mocks.fetchGuestBookings.mockResolvedValue([{ ...booking, refundCutoffAt: '2000-01-01T00:00:00Z' }])
  render(<MemoryRouter><TripsPage /></MemoryRouter>)
  expect(await screen.findByText(/contact support to request a change/i)).toBeVisible()
  expect(screen.queryByRole('button', { name: /cancel booking/i })).not.toBeInTheDocument()
})
