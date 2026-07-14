import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect } from 'vitest'

vi.mock('@clerk/clerk-react', () => ({
  SignIn: ({ afterSignInUrl }: { afterSignInUrl: string }) => (
    <div data-testid="clerk-sign-in" data-redirect={afterSignInUrl}>
      Clerk SignIn Component
    </div>
  ),
}))

import SignInPage from '../pages/SignInPage'

function renderAt(entry: string | { pathname: string; state?: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('SignInPage', () => {
  it('renders the sign-in heading and Clerk component', () => {
    renderAt('/sign-in')
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByTestId('clerk-sign-in')).toBeInTheDocument()
  })

  it('passes returnTo from location state as afterSignInUrl', () => {
    renderAt({ pathname: '/sign-in', state: { returnTo: '/booking/xyz/review' } })
    expect(screen.getByTestId('clerk-sign-in')).toHaveAttribute('data-redirect', '/booking/xyz/review')
  })

  it('defaults afterSignInUrl to "/" when no returnTo state', () => {
    renderAt('/sign-in')
    expect(screen.getByTestId('clerk-sign-in')).toHaveAttribute('data-redirect', '/')
  })
})
