import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  startPolling,
  type AppNotification,
} from '../utils/messagesApi'

const NOTIFICATIONS_POLL_MS = 20_000

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

/** Header bell: unread badge, polled updates, dropdown list that links into the app. */
export default function NotificationBell() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user?.id) return
    const poller = startPolling(async () => {
      const ns = await fetchNotifications(getToken)
      setItems(ns)
    }, NOTIFICATIONS_POLL_MS)
    return () => poller.stop()
  }, [user?.id, getToken])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (!user) return null
  const unread = items.filter(n => !n.read).length

  const handleOpen = (n: AppNotification) => {
    setOpen(false)
    if (!n.read) {
      setItems(prev => prev.map(p => (p.id === n.id ? { ...p, read: true } : p)))
      markNotificationRead(getToken, n.id).catch(() => {})
    }
    if (n.link) navigate(n.link)
  }

  const handleMarkAll = () => {
    setItems(prev => prev.map(p => ({ ...p, read: true })))
    markAllNotificationsRead(getToken).catch(() => {})
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative inline-flex items-center justify-center rounded-full p-2 text-slate-600 hover:text-brand transition-colors"
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-danger text-white text-[10px] font-semibold flex items-center justify-center px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 card shadow-lg z-50 overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="font-semibold text-sm text-slate-900">Notifications</p>
            {unread > 0 && (
              <button onClick={handleMarkAll} className="text-xs font-medium text-brand hover:text-brand-dark bg-transparent border-0 cursor-pointer p-0">
                Mark all read
              </button>
            )}
          </div>
          <ul role="list" className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-sm text-slate-500 text-center">You're all caught up.</li>
            ) : (
              items.map(n => (
                <li key={n.id}>
                  <button
                    onClick={() => handleOpen(n)}
                    className={`w-full text-left px-4 py-3 bg-transparent border-0 cursor-pointer hover:bg-brand/5 transition-colors ${n.read ? 'opacity-60' : ''}`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="px-4 py-2.5 border-t border-slate-100 text-center">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-brand hover:text-brand-dark no-underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
