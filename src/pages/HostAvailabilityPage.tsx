import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { fetchListing } from '../utils/listingsApi'
import { fetchBlockedRanges, addBlockedRange, removeBlockedRange, type BlockedRange } from '../utils/availabilityApi'
import { fetchBookedDateRanges, rangesOverlap } from '../utils/bookingsApi'
import { formatDateShort } from '../utils/booking'
import type { Listing } from '../bookingTypes'

/** Host calendar: block/unblock date ranges so guests can't book when the boat isn't available. */
export default function HostAvailabilityPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useUser()
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState<BlockedRange[]>([])
  const [booked, setBooked] = useState<{ checkIn: string; checkOut: string }[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([fetchListing(id), fetchBlockedRanges(id), fetchBookedDateRanges(id)]).then(
      ([l, blockedRanges, bookedRanges]) => {
        if (cancelled) return
        setListing(l)
        setBlocked(blockedRanges)
        setBooked(bookedRanges)
        setLoading(false)
      }
    )
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="container-p py-16 flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Loading calendar…</div>
      </div>
    )
  }

  if (!listing || (listing.hostId && user?.id !== listing.hostId)) {
    return (
      <div className="container-p py-16 text-center">
        <h1 className="font-display text-3xl font-semibold mb-4">Not available</h1>
        <p className="text-slate-500 mb-8">This listing doesn't exist or you don't manage it.</p>
        <Link to="/hosting" className="btn btn-primary no-underline">Back to dashboard</Link>
      </div>
    )
  }

  const handleBlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!startDate || !endDate) {
      setError('Please pick both a start and end date.')
      return
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError('The end date must be after the start date.')
      return
    }
    const conflictsBooking = booked.some(b => rangesOverlap(startDate, endDate, b.checkIn, b.checkOut))
    if (conflictsBooking) {
      setError('That range overlaps a confirmed guest booking — cancel or contact the guest first.')
      return
    }
    const conflictsBlock = blocked.some(b => rangesOverlap(startDate, endDate, b.startDate, b.endDate))
    if (conflictsBlock) {
      setError('That range overlaps dates you have already blocked.')
      return
    }

    setSaving(true)
    try {
      const created = await addBlockedRange(listing.id, startDate, endDate, reason)
      setBlocked(prev => [...prev, created].sort((a, b) => a.startDate.localeCompare(b.startDate)))
      setStartDate('')
      setEndDate('')
      setReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not block those dates.')
    } finally {
      setSaving(false)
    }
  }

  const handleUnblock = async (rangeId: string) => {
    try {
      await removeBlockedRange(rangeId)
      setBlocked(prev => prev.filter(b => b.id !== rangeId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not unblock those dates.')
    }
  }

  return (
    <div className="container-p py-8 max-w-4xl">
      <Link to="/hosting" className="text-brand hover:text-brand-dark no-underline inline-flex items-center gap-1.5 text-sm font-medium mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to dashboard
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-medium text-muted">Availability calendar</h1>
        <p className="text-slate-500 mt-1">{listing.title} · {listing.location}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <form onSubmit={handleBlock} className="card p-6">
            <h2 className="font-semibold text-base mb-1">Block dates</h2>
            <p className="text-sm text-slate-500 mb-5">
              Guests won't be able to reserve your boat during blocked ranges.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="block-start" className="block text-sm font-medium text-slate-700 mb-1.5">From</label>
                  <input
                    id="block-start"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="block-end" className="block text-sm font-medium text-slate-700 mb-1.5">Until</label>
                  <input
                    id="block-end"
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="input"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="block-reason" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Note <span className="text-slate-400 font-normal">(optional, only you see this)</span>
                </label>
                <input
                  id="block-reason"
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Personal use, maintenance"
                  className="input"
                />
              </div>

              {error && <p className="text-sm text-danger" role="alert">{error}</p>}

              <button type="submit" className="btn btn-primary w-full" disabled={saving}>
                {saving ? 'Blocking…' : 'Block these dates'}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold text-base mb-4">Blocked by you</h2>
            {blocked.length === 0 ? (
              <p className="text-sm text-slate-400">No blocked dates — your boat is open whenever it isn't booked.</p>
            ) : (
              <ul className="space-y-3">
                {blocked.map(b => (
                  <li key={b.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">
                        {formatDateShort(b.startDate)} – {formatDateShort(b.endDate)}
                      </p>
                      {b.reason && <p className="text-slate-400 text-xs mt-0.5">{b.reason}</p>}
                    </div>
                    <button
                      onClick={() => handleUnblock(b.id)}
                      className="text-danger hover:underline bg-transparent border-0 cursor-pointer p-0 text-sm flex-shrink-0"
                    >
                      Unblock
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-base mb-4">Guest bookings</h2>
            {booked.length === 0 ? (
              <p className="text-sm text-slate-400">No confirmed bookings yet.</p>
            ) : (
              <ul className="space-y-2">
                {booked.map((b, i) => (
                  <li key={i} className="text-sm text-slate-800 font-medium">
                    {formatDateShort(b.checkIn)} – {formatDateShort(b.checkOut)}
                    <span className="ml-2 text-xs font-normal text-brand bg-brand/10 rounded-full px-2 py-0.5">Booked</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
