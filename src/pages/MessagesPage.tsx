import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  startPolling,
  SYSTEM_SENDER,
  type Conversation,
  type Message,
} from '../utils/messagesApi'
import { fetchHostProfile } from '../utils/hostProfilesApi'
import { formatDateLong } from '../utils/booking'

const THREAD_POLL_MS = 4000

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  if (message.senderId === SYSTEM_SENDER) {
    return (
      <div className="mx-auto max-w-lg my-2">
        <p className="text-xs text-slate-500 bg-slate-100 rounded-xl px-4 py-3 whitespace-pre-line">{message.body}</p>
      </div>
    )
  }
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} my-1.5`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${
        mine ? 'bg-brand text-white rounded-br-md' : 'bg-white ring-1 ring-black/5 text-slate-700 rounded-bl-md'
      }`}>
        <p>{message.body}</p>
        <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-slate-400'}`}>{timeLabel(message.createdAt)}</p>
      </div>
    </div>
  )
}

/** Inbox + thread view for host↔guest booking chats. */
export default function MessagesPage() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [counterpartName, setCounterpartName] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const active = conversations.find(c => c.id === conversationId) ?? null

  // The inbox depends only on the signed-in user — switching threads must
  // not refetch it.
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    fetchConversations(getToken)
      .then(cs => { if (!cancelled) setConversations(cs) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.id, getToken])

  // Deep link straight into the newest conversation when landing on /messages.
  useEffect(() => {
    if (!conversationId && conversations.length) {
      navigate(`/messages/${conversations[0].id}`, { replace: true })
    }
  }, [conversationId, conversations, navigate])

  // Load the active thread and keep it fresh by polling (the messages table
  // is not exposed to the anon key, so realtime streaming isn't available).
  useEffect(() => {
    if (!conversationId || !user?.id) return
    setMessages([])
    // Opening the thread marks it read server-side; clear its badge locally too.
    setConversations(prev =>
      prev.map(c => (c.id === conversationId && c.unreadCount ? { ...c, unreadCount: 0 } : c)),
    )
    const poller = startPolling(async () => {
      const ms = await fetchMessages(getToken, conversationId)
      setMessages(prev => (ms.length === prev.length ? prev : ms))
    }, THREAD_POLL_MS)
    return () => poller.stop()
  }, [conversationId, user?.id, getToken])

  // Who is the other side? Guests see the host's profile name; hosts see the guest's booking name.
  useEffect(() => {
    if (!active || !user?.id) return
    if (user.id === active.hostId) {
      setCounterpartName(active.booking?.guestDetails.name ?? 'Guest')
    } else {
      setCounterpartName('Host')
      fetchHostProfile(active.hostId).then(p => { if (p?.name) setCounterpartName(p.name) })
    }
  }, [active, user?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (!user) return null

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body || !conversationId) return
    setSending(true)
    setSendError('')
    try {
      const m = await sendMessage(getToken, conversationId, body)
      setMessages(prev => (prev.some(p => p.id === m.id) ? prev : [...prev, m]))
      setDraft('') // cleared only on success — a failed send keeps the draft
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Could not send your message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="bg-background min-h-screen">
      <div className="container-p py-8">
        <h1 className="font-display text-3xl font-medium text-muted mb-6">Messages</h1>

        {loading ? (
          <div className="animate-pulse text-slate-400 text-sm py-8">Loading conversations…</div>
        ) : conversations.length === 0 ? (
          <div className="card p-8 text-center max-w-xl mx-auto">
            <h2 className="font-display text-2xl font-medium text-muted">No messages yet</h2>
            <p className="text-slate-500 mt-2">
              When a booking is confirmed, a chat opens here between the guest and the host.
            </p>
            <Link to="/" className="btn btn-primary no-underline inline-block mt-6">Explore boats</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 items-start">
            {/* Conversation list */}
            <ul role="list" className="space-y-2">
              {conversations.map(c => (
                <li key={c.id}>
                  <Link
                    to={`/messages/${c.id}`}
                    className={`card block p-3 no-underline hover:ring-brand/40 transition-shadow ${
                      c.id === conversationId ? 'ring-2 ring-brand/50' : ''
                    }`}
                  >
                    <div className="flex gap-3 items-center">
                      {c.listing?.image ? (
                        <img src={c.listing.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-slate-900 truncate">{c.listing?.title ?? 'Booking chat'}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {c.lastMessagePreview ?? 'New conversation'}
                        </p>
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-brand text-white text-[11px] font-semibold px-1.5">
                          {c.unreadCount > 9 ? '9+' : c.unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Active thread */}
            {active ? (
              <div className="card flex flex-col h-[70vh]">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{counterpartName}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {active.listing?.title}
                      {active.booking && ` · ${formatDateLong(active.booking.checkIn)} → ${formatDateLong(active.booking.checkOut)}`}
                    </p>
                  </div>
                  {active.listing && (
                    <Link to={`/listing/${active.listing.id}`} className="text-sm font-medium text-brand no-underline hover:text-brand-dark whitespace-nowrap">
                      View listing
                    </Link>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 bg-background/60">
                  {messages.map(m => (
                    <MessageBubble key={m.id} message={m} mine={m.senderId === user.id} />
                  ))}
                  <div ref={bottomRef} />
                </div>

                {sendError && (
                  <p className="px-5 py-2 text-xs text-danger border-t border-slate-100" role="alert">{sendError}</p>
                )}
                <form onSubmit={handleSend} className="p-4 border-t border-slate-100 flex gap-3">
                  <input
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder="Write a message…"
                    aria-label="Message"
                    className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                  <button type="submit" disabled={sending || !draft.trim()} className="btn btn-primary rounded-full disabled:opacity-50">
                    Send
                  </button>
                </form>
              </div>
            ) : (
              <div className="card p-8 text-center text-slate-500 text-sm">Select a conversation</div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
