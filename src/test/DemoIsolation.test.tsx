import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { demoSteps } from '../data/demo'

const { liveAuth, liveData } = vi.hoisted(() => ({
  liveAuth: vi.fn(() => { throw new Error('Live auth must not mount in the demo') }),
  liveData: vi.fn(() => { throw new Error('Live data must not be used in the demo') }),
}))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: liveAuth, useUser: liveAuth, useClerk: liveAuth,
  SignedIn: liveAuth, SignedOut: liveAuth, SignIn: liveAuth, SignUp: liveAuth,
}))
vi.mock('../utils/supabase', () => ({
  supabase: { from: liveData, functions: { invoke: liveData }, storage: { from: liveData } },
  uploadListingImage: liveData, deleteListingImage: liveData,
}))

import App from '../App'

afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); vi.clearAllMocks() })

describe('Demo isolation in the actual app', () => {
  it.each(['/demo', '/demo/'])('runs at %s without mounting authentication, polling, or profile sync', (path) => {
    window.history.replaceState(null, '', path)
    render(<App />)
    for (const step of demoSteps) {
      fireEvent.click(within(screen.getByRole('region', { name: 'Demo app preview' })).getByRole('button', { name: new RegExp(step.action) }))
    }
    expect(screen.getByRole('status')).toHaveTextContent('Demo complete')
    expect(liveAuth).not.toHaveBeenCalled()
    expect(liveData).not.toHaveBeenCalled()
  })
})
