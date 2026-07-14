import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect } from 'vitest'

vi.mock('@clerk/clerk-react', () => ({
  SignUp: () => <div data-testid="clerk-sign-up">Clerk SignUp Component</div>,
}))

import SignUpPage from '../pages/SignUpPage'

describe('SignUpPage', () => {
  it('renders the sign-up heading and Clerk component', () => {
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument()
    expect(screen.getByTestId('clerk-sign-up')).toBeInTheDocument()
  })
})
