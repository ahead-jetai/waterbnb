import { supabase } from './supabase'
import type { Booking, Listing } from '../bookingTypes'

/**
 * Client for the `messages` Supabase Edge Function. The chat tables have no
 * public RLS policies (they carry guest PII), so every call sends the
 * caller's Clerk session token; the function verifies it and enforces
 * conversation membership server-side. Conversations themselves are created
 * server-side by the payments function when a checkout is finalized.
 */

export const SYSTEM_SENDER = 'system'

export type Message = {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
}

export type Conversation = {
  id: string
  bookingId: string
  listingId: string
  hostId: string
  guestId: string
  createdAt: string
  lastMessagePreview: string | null
  lastMessageAt: string | null
  unreadCount: number
  listing?: Listing
  booking?: Booking
}

export type AppNotification = {
  id: string
  userId: string
  title: string
  body: string
  link: string | null
  read: boolean
  createdAt: string
}

type MessageRow = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string }
type NotificationRow = { id: string; user_id: string; title: string; body: string; link: string | null; read: boolean; created_at: string }

/** A Clerk session token supplier — pass `getToken` from Clerk's useAuth(). */
export type TokenGetter = () => Promise<string | null>

async function invoke<T>(route: string, getToken: TokenGetter, body: Record<string, unknown> = {}): Promise<T> {
  const token = await getToken()
  if (!token) throw new Error('Not signed in')
  const { data, error } = await supabase.functions.invoke(`messages/${route}`, {
    body,
    headers: { 'x-clerk-token': token },
  })
  if (error) {
    if ('context' in error && error.context instanceof Response) {
      const payload = await error.context.json().catch(() => null)
      if (payload?.error) throw new Error(payload.error)
    }
    throw new Error(error.message ?? 'Messaging request failed')
  }
  return data as T
}

function rowToMessage(r: MessageRow): Message {
  return { id: r.id, conversationId: r.conversation_id, senderId: r.sender_id, body: r.body, createdAt: r.created_at }
}

function rowToNotification(r: NotificationRow): AppNotification {
  return { id: r.id, userId: r.user_id, title: r.title, body: r.body, link: r.link, read: r.read, createdAt: r.created_at }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToConversation(r: any): Conversation {
  return {
    id: r.id,
    bookingId: r.booking_id,
    listingId: r.listing_id,
    hostId: r.host_id,
    guestId: r.guest_id,
    createdAt: r.created_at,
    lastMessagePreview: r.last_message_preview ?? null,
    lastMessageAt: r.last_message_at ?? null,
    unreadCount: r.unread_count ?? 0,
    listing: r.listing
      ? {
          id: r.listing.id,
          title: r.listing.title,
          location: r.listing.location,
          pricePerNight: Number(r.listing.price_per_night),
          rating: Number(r.listing.rating ?? 0),
          reviews: r.listing.reviews ?? 0,
          image: r.listing.images?.[0] ?? r.listing.image ?? '',
          tags: r.listing.amenities ?? [],
        }
      : undefined,
    booking: r.booking
      ? {
          id: r.booking.id,
          listingId: r.listing_id,
          guestId: r.guest_id,
          checkIn: r.booking.check_in,
          checkOut: r.booking.check_out,
          guests: r.booking.guests,
          status: r.booking.status,
          guestDetails: {
            name: r.booking.guest_name,
            email: r.booking.guest_email,
            phone: r.booking.guest_phone,
            specialRequests: r.booking.special_requests ?? undefined,
          },
          subtotal: Number(r.booking.subtotal),
          serviceFee: Number(r.booking.service_fee),
          total: Number(r.booking.total),
          bookingReference: r.booking.booking_reference,
          createdAt: r.booking.created_at,
        }
      : undefined,
  }
}

/** All conversations the caller participates in, most recent activity first. */
export async function fetchConversations(getToken: TokenGetter): Promise<Conversation[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { conversations } = await invoke<{ conversations: any[] }>('conversations', getToken)
  return conversations.map(rowToConversation)
}

export async function fetchMessages(getToken: TokenGetter, conversationId: string): Promise<Message[]> {
  const { messages } = await invoke<{ messages: MessageRow[] }>('thread', getToken, { conversationId })
  return messages.map(rowToMessage)
}

export async function sendMessage(getToken: TokenGetter, conversationId: string, body: string): Promise<Message> {
  const { message } = await invoke<{ message: MessageRow }>('send', getToken, { conversationId, body })
  return rowToMessage(message)
}

/** Total unread chat messages across all of the caller's conversations. */
export async function fetchUnreadMessagesCount(getToken: TokenGetter): Promise<number> {
  const { count } = await invoke<{ count: number }>('unread-count', getToken)
  return count
}

export async function fetchNotifications(getToken: TokenGetter): Promise<AppNotification[]> {
  const { notifications } = await invoke<{ notifications: NotificationRow[] }>('notifications', getToken)
  return notifications.map(rowToNotification)
}

export async function markNotificationRead(getToken: TokenGetter, id: string): Promise<void> {
  await invoke('mark-read', getToken, { id })
}

export async function markAllNotificationsRead(getToken: TokenGetter): Promise<void> {
  await invoke('mark-read', getToken)
}

/**
 * Poll on an interval (the chat tables aren't exposed to the anon key, so
 * Supabase realtime can't stream them). Fires immediately, then every
 * `intervalMs`; errors are swallowed so a flaky poll never crashes the UI.
 */
export function startPolling(fn: () => Promise<void>, intervalMs: number): { stop: () => void } {
  let stopped = false
  const tick = () => { if (!stopped) fn().catch(() => {}) }
  tick()
  const id = setInterval(tick, intervalMs)
  return { stop: () => { stopped = true; clearInterval(id) } }
}
