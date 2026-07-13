import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ReactNode } from 'react'

// Mutable flag the Clerk mock reads so we can flip auth state per test.
const authState = { signedIn: false }

vi.mock('@clerk/clerk-react', () => ({
  SignedIn: ({ children }: { children: ReactNode }) =>
    authState.signedIn ? <>{children}</> : null,
  SignedOut: ({ children }: { children: ReactNode }) =>
    authState.signedIn ? null : <>{children}</>,
  UserButton: () => <button aria-label="Open user menu">User Avatar</button>,
}))

import Header from '../components/Header'

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  )
}

describe('Header', () => {
  beforeEach(() => {
    authState.signedIn = false
  })

  it('shows a Sign in link when signed out', () => {
    authState.signedIn = false
    renderHeader()
    expect(screen.getAllByRole('link', { name: /sign in/i }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /open user menu/i })).not.toBeInTheDocument()
  })

  it('shows the UserButton when signed in', () => {
    authState.signedIn = true
    renderHeader()
    expect(screen.getAllByRole('button', { name: /open user menu/i }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument()
  })
})
