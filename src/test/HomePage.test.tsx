import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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
