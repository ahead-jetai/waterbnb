import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { userEvent } from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const clerkState = {
  signedIn: false,
  metadata: {} as Record<string, unknown>,
}

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isSignedIn: clerkState.signedIn, isLoaded: true }),
  useUser: () => ({
    user: clerkState.signedIn
      ? { firstName: 'Jane', unsafeMetadata: clerkState.metadata, update: vi.fn() }
      : null,
    isLoaded: true,
  }),
}))

import { listings as mockListings } from '../data/listings'
import type { Listing } from '../bookingTypes'

// What fetchListings resolves with; the API already returns newest-first, so array order = "Newest".
let fetchedListings: Listing[] = mockListings
vi.mock('../utils/listingsApi', () => ({
  fetchListings: () => Promise.resolve(fetchedListings),
}))

import HomePage from '../pages/HomePage'

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/hosting" element={<div>Hosting Dashboard Stub</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('HomePage — signed out', () => {
  beforeEach(() => {
    clerkState.signedIn = false
    clerkState.metadata = {}
  })

  it('shows the marketing landing with register and sign-in CTAs', () => {
    renderHome()
    expect(screen.getByRole('link', { name: /create a free account/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /sign in/i }).length).toBeGreaterThan(0)
  })

  it('does not show the members-only listings grid', () => {
    renderHome()
    expect(screen.queryByText(/featured listings/i)).not.toBeInTheDocument()
  })
})

describe('HomePage — signed in, traveling mode', () => {
  beforeEach(() => {
    clerkState.signedIn = true
    clerkState.metadata = {}
  })

  it('greets the user and shows the listings grid', () => {
    renderHome()
    expect(screen.getByText(/welcome back, jane/i)).toBeInTheDocument()
    expect(screen.getByText(/featured listings/i)).toBeInTheDocument()
  })

  it('does not show register CTAs', () => {
    renderHome()
    expect(screen.queryByRole('link', { name: /create a free account/i })).not.toBeInTheDocument()
  })
})

describe('HomePage — signed in, hosting mode', () => {
  beforeEach(() => {
    clerkState.signedIn = true
    clerkState.metadata = { mode: 'hosting' }
  })

  it('redirects to the hosting dashboard', () => {
    renderHome()
    expect(screen.getByText('Hosting Dashboard Stub')).toBeInTheDocument()
    expect(screen.queryByText(/featured listings/i)).not.toBeInTheDocument()
  })
})

describe('HomePage — sort dropdown', () => {
  // Deliberately shuffled so that newest / price / rating all produce distinct orders.
  const base = { location: 'Somewhere', reviews: 10, image: '', tags: [] }
  const fixture: Listing[] = [
    { ...base, id: 'f1', title: 'Harbor Loft', pricePerNight: 300, rating: 4.2 },
    { ...base, id: 'f2', title: 'River Barge', pricePerNight: 120, rating: 4.9 },
    { ...base, id: 'f3', title: 'Lagoon Cat', pricePerNight: 450, rating: 3.8 },
    { ...base, id: 'f4', title: 'Fjord Cabin', pricePerNight: 200, rating: 4.5 },
  ]
  const newestOrder = ['Harbor Loft', 'River Barge', 'Lagoon Cat', 'Fjord Cabin']

  /** Titles of the rendered listing cards, top to bottom. */
  async function renderedTitles() {
    const headings = await screen.findAllByRole('heading', { level: 3 })
    return headings.map(h => h.textContent)
  }

  beforeEach(() => {
    clerkState.signedIn = true
    clerkState.metadata = {}
    fetchedListings = fixture
  })

  it('defaults to "Newest" and keeps the fetched order', async () => {
    renderHome()
    expect(screen.getByLabelText(/sort by/i)).toHaveValue('newest')
    expect(await renderedTitles()).toEqual(newestOrder)
  })

  it('sorts by price, low to high', async () => {
    const user = userEvent.setup()
    renderHome()
    await user.selectOptions(screen.getByLabelText(/sort by/i), 'price-asc')
    expect(await renderedTitles()).toEqual(['River Barge', 'Fjord Cabin', 'Harbor Loft', 'Lagoon Cat'])
  })

  it('sorts by price, high to low', async () => {
    const user = userEvent.setup()
    renderHome()
    await user.selectOptions(screen.getByLabelText(/sort by/i), 'price-desc')
    expect(await renderedTitles()).toEqual(['Lagoon Cat', 'Harbor Loft', 'Fjord Cabin', 'River Barge'])
  })

  it('sorts by highest rating first', async () => {
    const user = userEvent.setup()
    renderHome()
    await user.selectOptions(screen.getByLabelText(/sort by/i), 'rating')
    expect(await renderedTitles()).toEqual(['River Barge', 'Fjord Cabin', 'Harbor Loft', 'Lagoon Cat'])
  })

  it('restores the fetched order when switching back to "Newest"', async () => {
    const user = userEvent.setup()
    renderHome()
    const sortSelect = screen.getByLabelText(/sort by/i)
    await user.selectOptions(sortSelect, 'price-desc')
    expect(await renderedTitles()).not.toEqual(newestOrder)
    await user.selectOptions(sortSelect, 'newest')
    expect(await renderedTitles()).toEqual(newestOrder)
  })

  it('"Clear filters" appears once a sort is chosen and resets it to "Newest"', async () => {
    const user = userEvent.setup()
    renderHome()
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument()

    const sortSelect = screen.getByLabelText(/sort by/i)
    await user.selectOptions(sortSelect, 'rating')
    await user.click(screen.getByRole('button', { name: /clear filters/i }))

    expect(sortSelect).toHaveValue('newest')
    expect(await renderedTitles()).toEqual(newestOrder)
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument()
  })
})
