import { supabase } from './supabase'

/**
 * Public host profile mirrored into Supabase. Clerk only exposes the signed-in
 * user in the browser, so hosts sync their name/avatar here for others to see.
 */
export type HostProfile = {
  id: string // Clerk user id
  name: string
  avatarUrl: string
  bio: string
}

type HostProfileRow = {
  id: string
  name: string
  avatar_url: string
  bio: string
}

function rowToProfile(row: HostProfileRow): HostProfile {
  return { id: row.id, name: row.name, avatarUrl: row.avatar_url, bio: row.bio }
}

export async function fetchHostProfile(id: string): Promise<HostProfile | null> {
  const { data, error } = await supabase.from('host_profiles').select('*').eq('id', id).maybeSingle()
  if (error) {
    console.error('Failed to fetch host profile:', error.message)
    return null
  }
  return data ? rowToProfile(data as HostProfileRow) : null
}

/** Keep the public name/avatar in sync with Clerk without touching the bio. */
export async function syncHostProfile(id: string, name: string, avatarUrl: string): Promise<void> {
  const { error } = await supabase
    .from('host_profiles')
    .upsert({ id, name, avatar_url: avatarUrl, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) console.error('Failed to sync host profile:', error.message)
}

/**
 * Overall host rating: review-weighted average across their listings.
 * Returns null when no listing has reviews yet.
 */
export function computeHostRating(
  listings: { rating: number; reviews: number }[]
): { rating: number; reviews: number } | null {
  const rated = listings.filter(l => l.reviews > 0 && l.rating > 0)
  const totalReviews = rated.reduce((sum, l) => sum + l.reviews, 0)
  if (totalReviews === 0) return null
  const weighted = rated.reduce((sum, l) => sum + l.rating * l.reviews, 0) / totalReviews
  return { rating: Math.round(weighted * 100) / 100, reviews: totalReviews }
}

export async function updateHostBio(id: string, bio: string): Promise<void> {
  const { error } = await supabase
    .from('host_profiles')
    .upsert({ id, bio, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) throw new Error(`Could not save your bio: ${error.message}`)
}
