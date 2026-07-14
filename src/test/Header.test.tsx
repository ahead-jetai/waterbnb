import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ReactNode } from 'react'

// Mutable state the Clerk mock reads so each test can set auth + mode.
const mockUpdate = vi.fn()
const clerkState = {
  signedIn: false,
  metadata: {} as Record<string, unknown>,
}

vi.mock('@clerk/clerk-react', () => ({
  SignedIn: ({ children }: { children: ReactNode }) =>
    clerkState.signedIn ? <>{children}</> : null,
  SignedOut: ({ children }: { children: ReactNode }) =>
    clerkState.signedIn ? null : <>{children}</>,
  useUser: () => ({
    user: clerkState.signedIn
      ? {
          unsafeMetadata: clerkState.metadata,
          update: mockUpdate,
          firstName: 'Jane',
          imageUrl: 'https://example.com/avatar.png',
        }
      : null,
    isLoaded: true,
  }),
}))

import Header from '../components/Header'

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  )
}

describe('Header — signed out', () => {
  beforeEach(() => {
    clerkState.signedIn = false
    clerkState.metadata = {}
    mockUpdate.mockReset()
  })

  it('shows Sign in and Get started links', () => {
    renderHeader()
    expect(screen.getAllByRole('link', { name: /sign in/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /get started/i }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: /your profile/i })).not.toBeInTheDocument()
  })

  it('does not show mode switch or nav links', () => {
    renderHeader()
    expect(screen.queryByText(/switch to hosting/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /explore/i })).not.toBeInTheDocument()
  })
})

describe('Header — signed in, traveling mode', () => {
  beforeEach(() => {
    clerkState.signedIn = true
    clerkState.metadata = {}
    mockUpdate.mockReset()
  })

  it('shows Explore nav, Switch to hosting, and the profile link', () => {
    renderHeader()
    expect(screen.getAllByRole('link', { name: /explore/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /switch to hosting/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /your profile/i }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: /^sign in$/i })).not.toBeInTheDocument()
  })

  it('persists hosting mode when the switch is clicked', async () => {
    const user = userEvent.setup()
    renderHeader()
    await user.click(screen.getAllByRole('button', { name: /switch to hosting/i })[0])
    expect(mockUpdate).toHaveBeenCalledWith({ unsafeMetadata: { mode: 'hosting' } })
  })
})

describe('Header — signed in, hosting mode', () => {
  beforeEach(() => {
    clerkState.signedIn = true
    clerkState.metadata = { mode: 'hosting' }
    mockUpdate.mockReset()
  })

  it('shows hosting nav, a Hosting badge, and Switch to traveling', () => {
    renderHeader()
    expect(screen.getAllByRole('link', { name: /dashboard/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /create listing/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /switch to traveling/i }).length).toBeGreaterThan(0)
    expect(screen.getByText('Hosting')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /explore/i })).not.toBeInTheDocument()
  })
})
