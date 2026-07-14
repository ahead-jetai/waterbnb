import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import {
  createConnectAccount,
  createOnboardingLink,
  fetchConnectStatus,
  createListingProduct,
  type ConnectStatus,
} from '../utils/paymentsApi'
import { fetchHostListings } from '../utils/listingsApi'
import type { Listing } from '../bookingTypes'

function StatusPill({ ok, okLabel, pendingLabel }: { ok: boolean; okLabel: string; pendingLabel: string }) {
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
        ok ? 'bg-accent/10 text-accent-dark' : 'bg-warning/10 text-warning'
      }`}
    >
      {ok ? okLabel : pendingLabel}
    </span>
  )
}

/** Host payments setup: Stripe Connect onboarding status + per-listing products. */
export default function HostPaymentsPage() {
  const { user } = useUser()
  const [status, setStatus] = useState<ConnectStatus | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [productBusy, setProductBusy] = useState<string | null>(null)
  const [productDone, setProductDone] = useState<Set<string>>(new Set())

  const refresh = useCallback(async (userId: string) => {
    try {
      const [s, ls] = await Promise.all([fetchConnectStatus(userId), fetchHostListings(userId)])
      setStatus(s)
      setListings(ls)
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

  const handleCreateProduct = async (listingId: string) => {
    setProductBusy(listingId)
    setError('')
    try {
      await createListingProduct(listingId)
      setProductDone(prev => new Set(prev).add(listingId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the Stripe product.')
    } finally {
      setProductBusy(null)
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

        <h1 className="font-display text-3xl font-medium text-muted mb-1">Payments</h1>
        <p className="text-slate-500 mb-8">Get paid for bookings through Stripe.</p>

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
            <div className="card p-6 mb-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-base mb-1">Stripe account</h2>
                  <p className="text-sm text-slate-500">
                    Guests pay WaterBnB at checkout; your nightly earnings are transferred to
                    your Stripe account, and WaterBnB keeps its 12% service fee.
                  </p>
                </div>
                {status?.hasAccount && (
                  <StatusPill
                    ok={!!ready}
                    okLabel="Ready to receive payments"
                    pendingLabel="Setup incomplete"
                  />
                )}
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

            {/* Products card */}
            <div className="card p-6">
              <h2 className="font-semibold text-base mb-1">Listing products</h2>
              <p className="text-sm text-slate-500 mb-4">
                Each listing is sold through a Stripe product. Products are created
                automatically at first checkout, or you can create them ahead of time.
              </p>
              {listings.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No listings yet — <Link to="/host/list" className="text-brand no-underline">create one</Link> first.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {listings.map(l => (
                    <li key={l.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{l.title}</p>
                        <p className="text-xs text-slate-400">${l.pricePerNight}/night</p>
                      </div>
                      {productDone.has(l.id) ? (
                        <span className="text-xs font-medium text-accent-dark bg-accent/10 rounded-full px-2.5 py-1 flex-shrink-0">
                          Product ready
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCreateProduct(l.id)}
                          disabled={productBusy === l.id}
                          className="btn btn-secondary text-sm py-1.5 px-4 flex-shrink-0"
                        >
                          {productBusy === l.id ? 'Creating…' : 'Create Stripe product'}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
