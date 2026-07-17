import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { fetchEarnings, type EarningsSummary } from '../utils/paymentsApi'
import { fetchHostListings } from '../utils/listingsApi'
import { fetchHostAnalytics, type HostAnalytics } from '../utils/hostAnalyticsApi'

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usdCents = (cents: number) => usd(cents / 100)

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="font-display text-3xl font-medium text-muted mt-1">{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

/** Six-month revenue trend rendered as a simple CSS bar chart. */
function RevenueChart({ monthly }: { monthly: HostAnalytics['monthly'] }) {
  const max = Math.max(...monthly.map(m => m.revenue), 1)
  const BAR_MAX_PX = 120 // pixel heights: % heights collapse inside auto-height flex columns
  return (
    <div className="flex items-end gap-3" role="img" aria-label="Monthly revenue chart">
      {monthly.map(m => (
        <div key={m.month} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
          <span className="text-xs text-slate-500 tabular-nums">{m.revenue ? usd(m.revenue) : ''}</span>
          <div
            className={`w-full rounded-t-md transition-all ${m.revenue ? 'bg-brand/80' : 'bg-slate-200'}`}
            style={{ height: `${m.revenue ? Math.max(8, Math.round((m.revenue / max) * BAR_MAX_PX)) : 3}px` }}
            title={`${m.month}: ${usd(m.revenue)} · ${m.nights} nights`}
          />
          <span className="text-xs text-slate-400 truncate">{m.month.split(' ')[0]}</span>
        </div>
      ))}
    </div>
  )
}

function RecommendationBadge({ direction }: { direction: 'raise' | 'lower' | 'keep' }) {
  const styles = {
    raise: 'bg-accent/10 text-accent-dark',
    lower: 'bg-warning/10 text-warning',
    keep: 'bg-slate-100 text-slate-500',
  }
  const labels = { raise: 'Raise price', lower: 'Lower price', keep: 'Price is right' }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${styles[direction]}`}>
      {labels[direction]}
    </span>
  )
}

/** Host earnings & analytics: live Stripe money data + booking insights. */
export default function HostEarningsPage() {
  const { user } = useUser()
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
  const [analytics, setAnalytics] = useState<HostAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    const load = async () => {
      try {
        const listings = await fetchHostListings(user.id)
        // Stripe can be slow/unconfigured; booking analytics should still render.
        const [earningsResult, analyticsResult] = await Promise.allSettled([
          fetchEarnings(user.id),
          fetchHostAnalytics(user.id, listings),
        ])
        if (cancelled) return
        if (earningsResult.status === 'fulfilled') setEarnings(earningsResult.value)
        if (analyticsResult.status === 'fulfilled') setAnalytics(analyticsResult.value)
        if (earningsResult.status === 'rejected' && analyticsResult.status === 'rejected') {
          setError('Could not load your earnings data. Please try again.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  if (!user) return null

  return (
    <main className="bg-background min-h-screen">
      <div className="container-p py-8 max-w-5xl">
        <Link to="/hosting" className="text-brand hover:text-brand-dark no-underline inline-flex items-center gap-1.5 text-sm font-medium mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to dashboard
        </Link>

        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-medium text-muted mb-1">Earnings & analytics</h1>
            <p className="text-slate-500">How your boats are performing, and where the money is.</p>
          </div>
          <Link to="/host/payments" className="btn btn-secondary no-underline text-sm whitespace-nowrap">
            Payment settings
          </Link>
        </div>

        {error && (
          <div className="card p-4 mb-6 bg-danger/5 ring-danger/20">
            <p className="text-sm text-danger" role="alert">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="animate-pulse text-slate-400 text-sm py-8">Loading your earnings…</div>
        ) : (
          <div className="space-y-8">
            {/* Stripe money data */}
            <section aria-labelledby="stripe-heading">
              <h2 id="stripe-heading" className="font-semibold text-base mb-3">Your money on Stripe</h2>
              {earnings?.hasAccount ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard
                    label="Available for payout"
                    value={usdCents(earnings.availableCents ?? 0)}
                    hint="Ready to be sent to your bank"
                  />
                  <StatCard
                    label="Pending"
                    value={usdCents(earnings.pendingCents ?? 0)}
                    hint="Recent payments still settling"
                  />
                  <StatCard
                    label="Lifetime payments received"
                    value={usdCents(earnings.lifetimeCents ?? 0)}
                    hint="All transfers from WaterBnB bookings"
                  />
                </div>
              ) : (
                <div className="card p-6 flex items-center justify-between gap-4">
                  <p className="text-sm text-slate-500">
                    Connect a Stripe account to start receiving payouts and see live balance data here.
                  </p>
                  <Link to="/host/payments" className="btn btn-primary no-underline whitespace-nowrap">Set up payments</Link>
                </div>
              )}
            </section>

            {analytics && (
              <>
                {/* Booking performance */}
                <section aria-labelledby="performance-heading">
                  <h2 id="performance-heading" className="font-semibold text-base mb-3">Booking performance</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Earnings this month" value={usd(analytics.revenueThisMonth)} hint="Bookings checking in this month" />
                    <StatCard
                      label="Upcoming bookings"
                      value={String(analytics.upcomingBookings)}
                      hint={analytics.upcomingRevenue ? `${usd(analytics.upcomingRevenue)} on the books` : 'Nothing scheduled yet'}
                    />
                    <StatCard
                      label="Avg booking value"
                      value={analytics.avgBookingValue ? usd(analytics.avgBookingValue) : '—'}
                      hint={`${analytics.nightsBooked} nights booked all-time`}
                    />
                    <StatCard
                      label="Avg booking lead time"
                      value={analytics.avgLeadTimeDays !== null ? `${Math.round(analytics.avgLeadTimeDays)} days` : '—'}
                      hint="How far ahead guests book"
                    />
                  </div>
                </section>

                {/* Revenue trend */}
                <section aria-labelledby="trend-heading" className="card p-6">
                  <div className="flex items-baseline justify-between mb-4">
                    <h2 id="trend-heading" className="font-semibold text-base">Revenue, last 6 months</h2>
                    <p className="text-sm text-slate-500">{usd(analytics.totalRevenue)} all-time</p>
                  </div>
                  <RevenueChart monthly={analytics.monthly} />
                </section>

                {/* Per-listing breakdown + price recommendations */}
                <section aria-labelledby="listings-heading">
                  <h2 id="listings-heading" className="font-semibold text-base mb-3">Listing performance & pricing tips</h2>
                  {analytics.listings.length === 0 ? (
                    <div className="card p-6 flex items-center justify-between gap-4">
                      <p className="text-sm text-slate-500">Create your first listing to start tracking performance.</p>
                      <Link to="/host/list" className="btn btn-primary no-underline whitespace-nowrap">Create a listing</Link>
                    </div>
                  ) : (
                    <ul role="list" className="space-y-4">
                      {analytics.listings.map(({ listing, ...stats }) => (
                        <li key={listing.id} className="card p-5">
                          <div className="flex gap-4">
                            {listing.image ? (
                              <img src={listing.image} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-20 h-20 rounded-lg bg-slate-100 shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <Link to={`/listing/${listing.id}`} className="font-semibold text-slate-900 no-underline hover:text-brand truncate block">
                                    {listing.title}
                                  </Link>
                                  <p className="text-sm text-slate-500 truncate">{listing.location} · {usd(listing.pricePerNight)}/night</p>
                                </div>
                                <RecommendationBadge direction={stats.recommendation.direction} />
                              </div>

                              <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                                <div>
                                  <dt className="text-slate-400 text-xs">Revenue</dt>
                                  <dd className="font-medium text-slate-700">{usd(stats.revenue)}</dd>
                                </div>
                                <div>
                                  <dt className="text-slate-400 text-xs">Nights booked</dt>
                                  <dd className="font-medium text-slate-700">{stats.nightsBooked}</dd>
                                </div>
                                <div>
                                  <dt className="text-slate-400 text-xs">Next 60 days booked</dt>
                                  <dd className="font-medium text-slate-700">{Math.round(stats.occupancyNext60 * 100)}%</dd>
                                </div>
                                <div>
                                  <dt className="text-slate-400 text-xs">Next check-in</dt>
                                  <dd className="font-medium text-slate-700">
                                    {stats.nextCheckIn
                                      ? new Date(stats.nextCheckIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                      : '—'}
                                  </dd>
                                </div>
                              </dl>

                              <div className="mt-3 rounded-lg bg-brand/5 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm text-slate-600">
                                  <span className="font-semibold text-slate-800">
                                    Suggested price: {usd(stats.recommendation.price)}/night.
                                  </span>{' '}
                                  {stats.recommendation.reason}
                                </p>
                                {stats.recommendation.direction !== 'keep' && (
                                  <Link to={`/host/list/${listing.id}/edit`} className="text-sm font-medium text-brand no-underline hover:text-brand-dark whitespace-nowrap">
                                    Update price →
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
