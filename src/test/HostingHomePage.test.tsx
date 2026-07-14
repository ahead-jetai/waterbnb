import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const clerkState = {
  metadata: {} as Record<string, unknown>,
}

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    user: { firstName: 'Jane', unsafeMetadata: clerkState.metadata, update: vi.fn() },
    isLoaded: true,
  }),
}))

import HostingHomePage from '../pages/HostingHomePage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/hosting']}>
      <Routes>
        <Route path="/hosting" element={<HostingHomePage />} />
        <Route path="/" element={<div>Traveler Home Stub</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('HostingHomePage', () => {
  beforeEach(() => {
    clerkState.metadata = { mode: 'hosting' }
  })

  it('renders the hosting dashboard with a create-listing CTA', () => {
    renderPage()
    expect(screen.getByText(/welcome back, jane/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create a listing/i })).toBeInTheDocument()
    expect(screen.getByText(/active listings/i)).toBeInTheDocument()
  })

  it('redirects to home when the user is in traveling mode', () => {
    clerkState.metadata = {}
    renderPage()
    expect(screen.getByText('Traveler Home Stub')).toBeInTheDocument()
    expect(screen.queryByText(/active listings/i)).not.toBeInTheDocument()
  })
})
