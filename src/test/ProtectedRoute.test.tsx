import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect } from 'vitest'

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '@clerk/clerk-react'
import ProtectedRoute from '../components/ProtectedRoute'

const mockUseAuth = vi.mocked(useAuth)

function renderWithRouter(isSignedIn: boolean, isLoaded: boolean) {
  mockUseAuth.mockReturnValue({
    isSignedIn,
    isLoaded,
    userId: isSignedIn ? 'user_123' : null,
  } as unknown as ReturnType<typeof useAuth>)

  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/sign-in" element={<div>Sign In Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('shows a loading state while auth is loading', () => {
    renderWithRouter(false, false)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('redirects unauthenticated users to /sign-in', () => {
    renderWithRouter(false, true)
    expect(screen.getByText('Sign In Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when the user is authenticated', () => {
    renderWithRouter(true, true)
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('Sign In Page')).not.toBeInTheDocument()
  })
})
