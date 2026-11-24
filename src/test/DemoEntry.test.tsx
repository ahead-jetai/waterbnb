import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

// A signed-out visitor, so the live shell renders its public Header and Footer.
vi.mock('@clerk/clerk-react', () => ({
  SignedIn: () => null,
  SignedOut: ({ children }: { children: ReactNode }) => <>{children}</>,
  useUser: () => ({ user: null, isLoaded: true }),
  useAuth: () => ({ isSignedIn: false, isLoaded: true, getToken: async () => null }),
  useClerk: () => ({}),
  SignIn: () => null,
  SignUp: () => null,
}))
vi.mock('../utils/supabase', () => ({ supabase: {}, uploadListingImage: vi.fn(), deleteListingImage: vi.fn() }))
vi.mock('../utils/listingsApi', () => ({ fetchListings: () => Promise.resolve([]) }))

import App from '../App'

afterEach(() => { cleanup(); window.history.replaceState(null, '', '/') })

function expectLiveShell() {
  expect(screen.getAllByRole('link', { name: /sign in/i }).length).toBeGreaterThan(0)
  expect(screen.getByRole('navigation', { name: 'Footer' })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Exit demo' })).not.toBeInTheDocument()
  expect(screen.queryByText('Demo mode')).not.toBeInTheDocument()
}

describe('Entering and leaving the demo from the live app', () => {
  it('opens the demo from the footer link without the live shell, then exits back to it', () => {
    window.history.replaceState(null, '', '/')
    render(<App />)
    expectLiveShell()

    fireEvent.click(within(screen.getByRole('navigation', { name: 'Footer' })).getByRole('link', { name: 'Try the demo' }))
    expect(window.location.pathname).toBe('/demo')
    expect(screen.getByText('Demo mode')).toBeInTheDocument()
    // The footer entry point waits for the viewer; only the profile link autoplays.
    expect(screen.getByRole('status')).toHaveTextContent('Ready to play')
    expect(screen.queryByRole('navigation', { name: 'Footer' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Exit demo' }))
    expect(window.location.pathname).toBe('/')
    expectLiveShell()
  })

  describe('Public launch information', () => {
    it.each([
      ['Terms', 'Terms of Use'],
      ['Privacy', 'Privacy Notice'],
      ['Cancellation', 'Cancellation and refunds'],
      ['Safety', 'Safe stays on the water'],
      ['Support', 'WaterBnB Support'],
    ])('opens %s from the footer while signed out', (label, title) => {
      render(<App />)
      fireEvent.click(within(screen.getByRole('navigation', { name: 'Footer' })).getByRole('link', { name: label }))
      expect(screen.getByRole('heading', { name: title })).toBeVisible()
    })

    it('provides a support email with a safe refund reference without asking for card details', () => {
      window.history.replaceState(null, '', '/support?topic=cancellation&reference=WB12345')
      render(<App />)
      const href = screen.getByRole('link', { name: 'Email support' }).getAttribute('href')
      expect(href).toBe('mailto:ahead747@gmail.com?subject=WaterBnB%20booking%20or%20refund&body=Booking%20reference%3A%20WB12345%0A%0A')
      expect(screen.getByText(/do not email payment card numbers/i)).toBeVisible()
    })
  })
})
