import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import ListingDetailPage from '../pages/ListingDetailPage'

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(async () => 'clerk-session'),
  fetchListing: vi.fn(),
  fetchUnavailableRanges: vi.fn(),
  fetchPilotAccess: vi.fn(),
}))

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'guest' } }),
  useAuth: () => ({ getToken: mocks.getToken }),
}))
vi.mock('../utils/listingsApi', () => ({ fetchListing: mocks.fetchListing }))
vi.mock('../utils/bookingsApi', () => ({ fetchUnavailableRanges: mocks.fetchUnavailableRanges }))
vi.mock('../utils/paymentsApi', () => ({ fetchPilotAccess: mocks.fetchPilotAccess }))
vi.mock('../utils/hostProfilesApi', () => ({ fetchHostProfile: async () => null }))

function renderListing() {
  render(
    <MemoryRouter initialEntries={['/listing/approved-boat']}>
      <Routes><Route path="/listing/:id" element={<ListingDetailPage />} /></Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.fetchListing.mockResolvedValue({
    id: 'approved-boat', title: 'Harbor Stay', location: 'Los Angeles', pricePerNight: 100,
    capacity: 2, rating: 0, reviews: 0, image: '/placeholder.svg', tags: [],
  })
  mocks.fetchUnavailableRanges.mockResolvedValue([])
})

it('shows a real pilot listing but denies its booking form to an uninvited guest', async () => {
  mocks.fetchPilotAccess.mockResolvedValue(false)
  renderListing()
  expect(await screen.findByRole('heading', { name: 'Harbor Stay' })).toBeVisible()
  expect(await screen.findByRole('link', { name: 'Ask about the pilot' })).toHaveAttribute('href', '/support?topic=invite')
  expect(screen.queryByRole('button', { name: 'Reserve' })).not.toBeInTheDocument()
})

it('offers the booking form when the authenticated pilot check allows it', async () => {
  mocks.fetchPilotAccess.mockResolvedValue(true)
  renderListing()
  expect(await screen.findByRole('button', { name: 'Reserve' })).toBeVisible()
  expect(mocks.fetchPilotAccess).toHaveBeenCalledWith(mocks.getToken, 'approved-boat')
})

it('keeps booking unavailable when the live calendar cannot be loaded', async () => {
  mocks.fetchPilotAccess.mockResolvedValue(true)
  mocks.fetchUnavailableRanges.mockRejectedValue(new Error('Offline'))
  renderListing()
  expect(await screen.findByRole('alert')).toHaveTextContent("couldn't load this live listing or its availability")
  expect(screen.queryByRole('button', { name: 'Reserve' })).not.toBeInTheDocument()
})
