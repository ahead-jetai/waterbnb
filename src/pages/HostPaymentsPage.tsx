import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import {
  createConnectAccount,
  createOnboardingLink,
  fetchConnectStatus,
  type ConnectStatus,
} from '../utils/paymentsApi'

function AccountStatus({ status }: { status: ConnectStatus | null }) {
  if (!status || !status.hasAccount) {
    return (
      <div className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        Not connected
      </div>
    )
  }

  const ready = status.readyToReceivePayments && status.onboardingComplete

  if (ready) {
    return (
      <div className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-dark">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
        Active
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-sm font-medium text-warning">
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      Action required
    </div>
  )
}

/** Host payments setup: Stripe Connect onboarding and live account status. */
export default function HostPaymentsPage() {
  const { user } = useUser()
  const [status, setStatus] = useState<ConnectStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async (userId: string) => {
    try {
      const s = await fetchConnectStatus(userId)
      setStatus(s)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the payments service.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    refresh(user.id)
  }, [user?.id, refresh])

  if (!user) return null

  const handleOnboard = async () => {
    setWorking(true)
    setError('')
    try {
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
      const email = user.primaryEmailAddress?.emailAddress ?? `${user.id}@waterbnb.example`
      await createConnectAccount(user.id, name, email)
      const url = await createOnboardingLink(user.id)
      window.location.href = url // hand off to Stripe-hosted onboarding
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start onboarding.')
      setWorking(false)
    }
  }

  const ready = status?.hasAccount && status.readyToReceivePayments && status.onboardingComplete

  return (
    <main className="bg-background min-h-screen">
      <div className="container-p py-8 max-w-3xl">
        <Link to="/hosting" className="text-brand hover:text-brand-dark no-underline inline-flex items-center gap-1.5 text-sm font-medium mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to dashboard
        </Link>

        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-medium text-muted mb-1">Payments</h1>
            <p className="text-slate-500">Get paid for bookings through Stripe.</p>
          </div>
          <Link to="/host/earnings" className="btn btn-secondary no-underline text-sm whitespace-nowrap">
            Earnings & analytics
          </Link>
        </div>

        {error && (
          <div className="card p-4 mb-6 bg-danger/5 ring-danger/20">
            <p className="text-sm text-danger" role="alert">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="animate-pulse text-slate-400 text-sm py-8">Loading payment status…</div>
        ) : (
          <>
            {/* Onboarding card */}
            <div className="card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="font-semibold text-base">Stripe account</h2>
                    {status && <AccountStatus status={status} />}
                  </div>
                  <p className="text-sm text-slate-500">
                    Guests pay WaterBnB at checkout; your nightly earnings (minus card
                    processing fees) are transferred to your Stripe account, and WaterBnB
                    keeps its 12% service fee.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {status?.hasAccount ? (
                  <>
                    <p className="text-slate-600">
                      Payouts capability:{' '}
                      <span className="font-medium">{status.readyToReceivePayments ? 'active' : 'pending'}</span>
                    </p>
                    <p className="text-slate-600">
                      Requirements:{' '}
                      <span className="font-medium">
                        {status.onboardingComplete ? 'complete' : `action needed (${status.requirementsStatus})`}
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="text-slate-500">You haven't connected a Stripe account yet.</p>
                )}
              </div>

              <div className="mt-5 flex gap-3">
                <button onClick={handleOnboard} disabled={working} className="btn btn-primary">
                  {working
                    ? 'Redirecting to Stripe…'
                    : status?.hasAccount && !ready
                      ? 'Continue onboarding'
                      : status?.hasAccount
                        ? 'Update details on Stripe'
                        : 'Onboard to collect payments'}
                </button>
                {status?.hasAccount && (
                  <button onClick={() => { setLoading(true); refresh(user.id) }} className="btn btn-secondary">
                    Refresh status
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
