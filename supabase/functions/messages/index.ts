/**
 * WaterBnB messages — authenticated chat + notifications API.
 *
 * The chat tables (conversations, messages, notifications) contain PII and
 * have NO public RLS policies: the browser's anon key cannot touch them.
 * Every request here must carry a Clerk session JWT (x-clerk-token header),
 * which is verified against the Clerk instance's JWKS with a pinned issuer.
 * The verified `sub` claim is the only user id ever trusted — membership on
 * a conversation (host_id or guest_id) gates message reads/writes, and
 * notifications are always scoped to the caller.
 *
 * Routes (all POST, dispatched on the sub-path after /messages):
 *   /conversations   {}                          -> { conversations: [...] }
 *   /thread          { conversationId }          -> { messages: [...] }
 *   /send            { conversationId, body }    -> { message }
 *   /notifications   {}                          -> { notifications: [...] }
 *   /mark-read       { id? }                     -> { ok } (no id = mark all)
 *
 * Optional secret: CLERK_ISSUER to override the pinned Clerk instance.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Pinned to this app's Clerk instance (public info — it's inside the
// publishable key). Pinning prevents tokens minted by OTHER Clerk instances
// from passing verification via their own issuer's JWKS.
const clerkIssuer = Deno.env.get('CLERK_ISSUER') ?? 'https://bold-ant-89.clerk.accounts.dev'
const jwks = createRemoteJWKSet(new URL(`${clerkIssuer}/.well-known/jwks.json`))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clerk-token',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function fail(status: number, message: string): Response {
  return json({ error: message }, status)
}

/** Verify the Clerk session token and return the caller's user id. */
async function requireUserId(req: Request): Promise<string> {
  const token = req.headers.get('x-clerk-token')
  if (!token) throw new Response(null, { status: 401 })
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: clerkIssuer })
    if (!payload.sub) throw new Error('no sub')
    return String(payload.sub)
  } catch {
    throw new Response(null, { status: 401 })
  }
}

/** The conversation, only if the caller is one of its two participants. */
// deno-lint-ignore no-explicit-any
async function requireMembership(conversationId: string, userId: string): Promise<any> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle()
  if (error) throw new Error(`Supabase error: ${error.message}`)
  if (!data || (data.host_id !== userId && data.guest_id !== userId)) {
    throw new Response(null, { status: 403 })
  }
  return data
}

async function listConversations(userId: string): Promise<Response> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, listing:listings(*), booking:bookings(*)')
    .or(`host_id.eq.${userId},guest_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
  if (error) return fail(500, error.message)
  return json({ conversations: data ?? [] })
}

async function thread(userId: string, body: Record<string, unknown>): Promise<Response> {
  const { conversationId } = body as { conversationId?: string }
  if (!conversationId) return fail(400, 'conversationId is required')
  await requireMembership(conversationId, userId)

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) return fail(500, error.message)
  return json({ messages: data ?? [] })
}

async function send(userId: string, body: Record<string, unknown>): Promise<Response> {
  const { conversationId, body: text } = body as { conversationId?: string; body?: string }
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!conversationId || !trimmed) return fail(400, 'conversationId and body are required')
  if (trimmed.length > 4000) return fail(400, 'Message is too long')
  await requireMembership(conversationId, userId)

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: userId, body: trimmed })
    .select()
    .single()
  if (error) return fail(500, error.message)
  return json({ message: data })
}

async function listNotifications(userId: string): Promise<Response> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) return fail(500, error.message)
  return json({ notifications: data ?? [] })
}

async function markRead(userId: string, body: Record<string, unknown>): Promise<Response> {
  const { id } = body as { id?: string }
  let query = supabase.from('notifications').update({ read: true }).eq('user_id', userId)
  if (id) query = query.eq('id', id)
  const { error } = await query
  if (error) return fail(500, error.message)
  return json({ ok: true })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') return fail(405, 'Use POST')

  const route = new URL(req.url).pathname.split('/').filter(Boolean).pop()
  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    // empty body is fine for list routes
  }

  try {
    const userId = await requireUserId(req)
    switch (route) {
      case 'conversations':
        return await listConversations(userId)
      case 'thread':
        return await thread(userId, body)
      case 'send':
        return await send(userId, body)
      case 'notifications':
        return await listNotifications(userId)
      case 'mark-read':
        return await markRead(userId, body)
      default:
        return fail(404, `Unknown route: ${route}`)
    }
  } catch (err) {
    if (err instanceof Response) {
      return new Response(JSON.stringify({ error: err.status === 401 ? 'Not signed in' : 'Not allowed' }), {
        status: err.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.error(`messages/${route} failed:`, err)
    return fail(500, err instanceof Error ? err.message : 'Request failed')
  }
})
