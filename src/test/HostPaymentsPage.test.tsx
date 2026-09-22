import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ConnectStatus } from '../utils/paymentsApi'

const mockFetchConnectStatus = vi.fn()
const mockCreateConnectAccount = vi.fn()
const mockCreateOnboardingLink = vi.fn()

vi.mock('../utils/paymentsApi', () => ({
  fetchConnectStatus: (...args: unknown[]) => mockFetchConnectStatus(...args),
  createConnectAccount: (...args: unknown[]) => mockCreateConnectAccount(...args),
  createOnboardingLink: (...args: unknown[]) => mockCreateOnboardingLink(...args),
}))

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    user: {
      id: 'host_1',
      firstName: 'Jane',
      lastName: 'Sailor',
      primaryEmailAddress: { emailAddress: 'jane@example.com' },
    },
    isLoaded: true,
  }),
}))

import HostPaymentsPage from '../pages/HostPaymentsPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <HostPaymentsPage />
    </MemoryRouter>
  )
}

const notConnected: ConnectStatus = { hasAccount: false }
const active: ConnectStatus = {
  hasAccount: true,
  accountId: 'acct_1',
  readyToReceivePayments: true,
  onboardingComplete: true,
  requirementsStatus: 'complete',
}
const actionRequired: ConnectStatus = {
  hasAccount: true,
  accountId: 'acct_1',
  readyToReceivePayments: false,
  onboardingComplete: false,
  requirementsStatus: 'past_due',
}

describe('HostPaymentsPage', () => {
  beforeEach(() => {
    mockFetchConnectStatus.mockReset()
    mockCreateConnectAccount.mockReset()
    mockCreateOnboardingLink.mockReset()
  })

  it('shows the "Not connected" status and onboarding CTA when no account exists', async () => {
    mockFetchConnectStatus.mockResolvedValue(notConnected)
    renderPage()

    expect(await screen.findByText('Not connected')).toBeInTheDocument()
    expect(screen.getByText(/haven't connected a stripe account/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /onboard to collect payments/i })).toBeInTheDocument()
    // No "Refresh status" button until an account exists.
    expect(screen.queryByRole('button', { name: /refresh status/i })).not.toBeInTheDocument()
  })

  it('shows the "Active" status and the update CTA for a fully onboarded account', async () => {
    mockFetchConnectStatus.mockResolvedValue(active)
    renderPage()

    expect(await screen.findByText('Active')).toBeInTheDocument()
    expect(screen.getByText(/payouts capability/i)).toHaveTextContent(/active/i)
    expect(screen.getByText(/requirements/i)).toHaveTextContent(/complete/i)
    expect(screen.getByRole('button', { name: /update details on stripe/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /refresh status/i })).toBeInTheDocument()
  })

  it('shows the "Action required" status and continue CTA when onboarding is incomplete', async () => {
    mockFetchConnectStatus.mockResolvedValue(actionRequired)
    renderPage()

    expect(await screen.findByText('Action required')).toBeInTheDocument()
    expect(screen.getByText(/payouts capability/i)).toHaveTextContent(/pending/i)
    expect(screen.getByText(/requirements/i)).toHaveTextContent(/action needed \(past_due\)/i)
    expect(screen.getByRole('button', { name: /continue onboarding/i })).toBeInTheDocument()
  })

  it('surfaces an error when the status request fails', async () => {
    mockFetchConnectStatus.mockRejectedValue(new Error('Stripe is down'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Stripe is down')
  })

  it('starts Stripe onboarding using the account id and hosted link', async () => {
    mockFetchConnectStatus.mockResolvedValue(notConnected)
    mockCreateConnectAccount.mockResolvedValue('acct_new')
    mockCreateOnboardingLink.mockResolvedValue('https://stripe.example/onboard')

    // Prevent jsdom "navigation not implemented" noise from window.location assignment.
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, href: '' },
    })

    const user = userEvent.setup()
    renderPage()

    const onboard = await screen.findByRole('button', { name: /onboard to collect payments/i })
    await user.click(onboard)

    await waitFor(() => {
      expect(mockCreateConnectAccount).toHaveBeenCalledWith('host_1', 'Jane Sailor', 'jane@example.com')
      expect(mockCreateOnboardingLink).toHaveBeenCalledWith('host_1')
      expect(window.location.href).toBe('https://stripe.example/onboard')
    })

    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    })
  })

  it('reports an onboarding failure without navigating away', async () => {
    mockFetchConnectStatus.mockResolvedValue(notConnected)
    mockCreateConnectAccount.mockRejectedValue(new Error('Could not start onboarding.'))

    const user = userEvent.setup()
    renderPage()

    const onboard = await screen.findByRole('button', { name: /onboard to collect payments/i })
    await user.click(onboard)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not start onboarding.')
    expect(mockCreateOnboardingLink).not.toHaveBeenCalled()
  })
})
