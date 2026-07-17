import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../utils/messagesApi'

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

/** Full notifications tray: every notification, click-through to its link. */
export default function NotificationsPage() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    fetchNotifications(getToken)
      .then(ns => { if (!cancelled) setItems(ns) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.id, getToken])

  if (!user) return null
  const unread = items.filter(n => !n.read).length

  const handleOpen = (n: AppNotification) => {
    if (!n.read) {
      setItems(prev => prev.map(p => (p.id === n.id ? { ...p, read: true } : p)))
      markNotificationRead(getToken, n.id).catch(() => {})
    }
    // Booking-confirmation notifications link straight to their conversation.
    if (n.link) navigate(n.link)
  }

  const handleMarkAll = () => {
    setItems(prev => prev.map(p => ({ ...p, read: true })))
    markAllNotificationsRead(getToken).catch(() => {})
  }

  return (
    <main className="bg-background min-h-screen">
      <div className="container-p py-8 max-w-2xl">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-medium text-muted mb-1">Notifications</h1>
            <p className="text-slate-500">{unread ? `${unread} unread` : "You're all caught up."}</p>
          </div>
          {unread > 0 && (
            <button onClick={handleMarkAll} className="btn btn-secondary text-sm whitespace-nowrap">
              Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="animate-pulse text-slate-400 text-sm py-8">Loading notifications…</div>
        ) : items.length === 0 ? (
          <div className="card p-8 text-center">
            <h2 className="font-display text-2xl font-medium text-muted">Nothing here yet</h2>
            <p className="text-slate-500 mt-2">
              Booking confirmations and other updates will show up here.
            </p>
          </div>
        ) : (
          <ul role="list" className="space-y-3">
            {items.map(n => (
              <li key={n.id}>
                <button
                  onClick={() => handleOpen(n)}
                  className={`card w-full text-left p-4 cursor-pointer border-0 hover:ring-brand/40 transition-shadow flex gap-3 items-start ${
                    n.read ? 'opacity-70' : ''
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${n.read ? 'bg-slate-200' : 'bg-brand'}`}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{n.title}</span>
                    <span className="block text-sm text-slate-600 mt-0.5">{n.body}</span>
                    <span className="block text-xs text-slate-400 mt-1.5">
                      {timeLabel(n.createdAt)}
                      {n.link?.startsWith('/messages/') && ' · Opens conversation'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
