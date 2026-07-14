import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockSignOut = vi.fn()
const mockOpenUserProfile = vi.fn()
const mockUpdate = vi.fn()

const clerkState = {
  metadata: {} as Record<string, unknown>,
}

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    user: {
      firstName: 'Jane',
      lastName: 'Sailor',
      imageUrl: 'https://example.com/avatar.png',
      createdAt: new Date('2026-01-15'),
      primaryPhoneNumber: { phoneNumber: '+1 555 0100' },
      primaryEmailAddress: null,
      unsafeMetadata: clerkState.metadata,
      update: mockUpdate,
    },
    isLoaded: true,
  }),
  useClerk: () => ({ signOut: mockSignOut, openUserProfile: mockOpenUserProfile }),
}))

import ProfilePage from '../pages/ProfilePage'

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  )
}

describe('ProfilePage', () => {
  beforeEach(() => {
    clerkState.metadata = {}
    mockSignOut.mockReset()
    mockOpenUserProfile.mockReset()
    mockUpdate.mockReset()
  })

  it('shows the user identity and menu options', () => {
    renderPage()
    expect(screen.getByText('Jane Sailor')).toBeInTheDocument()
    expect(screen.getByText('+1 555 0100')).toBeInTheDocument()
    expect(screen.getByText(/my trips/i)).toBeInTheDocument()
    expect(screen.getByText(/switch to hosting/i)).toBeInTheDocument()
    expect(screen.getByText(/account & security/i)).toBeInTheDocument()
    expect(screen.getByText(/sign out/i)).toBeInTheDocument()
  })

  it('shows the hosting dashboard entry only in hosting mode', () => {
    clerkState.metadata = { mode: 'hosting' }
    renderPage()
    expect(screen.getByText(/hosting dashboard/i)).toBeInTheDocument()
    expect(screen.getByText(/switch to traveling/i)).toBeInTheDocument()
  })

  it('opens the Clerk account manager for account & security', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByText(/account & security/i))
    expect(mockOpenUserProfile).toHaveBeenCalled()
  })

  it('signs the user out', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByText(/^sign out$/i))
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('saves an edited name via user.update', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByText(/edit name/i))
    const first = screen.getByLabelText(/first name/i)
    await user.clear(first)
    await user.type(first, 'Janet')
    await user.click(screen.getByRole('button', { name: /^save$/i }))
    expect(mockUpdate).toHaveBeenCalledWith({ firstName: 'Janet', lastName: 'Sailor' })
  })
})
