import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in your .env file')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
export type TokenGetter = () => Promise<string | null>

export function authenticatedDb(getToken: TokenGetter) {
  return createClient(supabaseUrl, supabaseKey, { accessToken: getToken })
}

export const listingPublicColumns = 'id,title,location,price_per_night,rating,reviews,image,tags,created_at,boat_type,capacity,amenities,images,description,host_id,auto_approve_bookings,pilot_approved_at'

const LISTING_IMAGES_BUCKET = 'listing-images'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB, matches the bucket limit
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']

/**
 * Uploads a listing image to Supabase Storage and returns its public URL.
 * Throws with a user-friendly message on validation or upload failure.
 */
export async function uploadListingImage(getToken: TokenGetter, hostId: string, file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Please choose a JPEG, PNG, WebP, GIF, or AVIF image.')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image is too large. Maximum size is 10 MB.')
  }

  const ext = file.type.split('/')[1]
  const path = `${hostId}/${crypto.randomUUID()}.${ext}`

  const bucket = authenticatedDb(getToken).storage.from(LISTING_IMAGES_BUCKET)
  const { error } = await bucket.upload(path, file, { cacheControl: '3600', contentType: file.type })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const { data } = bucket.getPublicUrl(path)
  return data.publicUrl
}

/**
 * Deletes an uploaded listing image given its public URL.
 * URLs not pointing at our bucket (e.g. pasted external links) are ignored.
 */
export async function deleteListingImage(getToken: TokenGetter, hostId: string, publicUrl: string): Promise<void> {
  const prefix = `${supabaseUrl!.replace(/\/$/, '')}/storage/v1/object/public/${LISTING_IMAGES_BUCKET}/${hostId}/`
  if (!publicUrl.startsWith(prefix)) return
  const name = publicUrl.slice(prefix.length)
  if (!/^[0-9a-f-]{36}\.(jpeg|png|webp|gif|avif)$/.test(name)) return
  await authenticatedDb(getToken).storage.from(LISTING_IMAGES_BUCKET).remove([`${hostId}/${name}`])
}
