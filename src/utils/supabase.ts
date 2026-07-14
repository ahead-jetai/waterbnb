import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in your .env file')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

const LISTING_IMAGES_BUCKET = 'listing-images'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB, matches the bucket limit
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']

/**
 * Uploads a listing image to Supabase Storage and returns its public URL.
 * Throws with a user-friendly message on validation or upload failure.
 */
export async function uploadListingImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Please choose a JPEG, PNG, WebP, GIF, or AVIF image.')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image is too large. Maximum size is 10 MB.')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from(LISTING_IMAGES_BUCKET)
    .upload(path, file, { cacheControl: '3600', contentType: file.type })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const { data } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Deletes an uploaded listing image given its public URL.
 * URLs not pointing at our bucket (e.g. pasted external links) are ignored.
 */
export async function deleteListingImage(publicUrl: string): Promise<void> {
  const marker = `/object/public/${LISTING_IMAGES_BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return
  const path = decodeURIComponent(publicUrl.slice(idx + marker.length))
  await supabase.storage.from(LISTING_IMAGES_BUCKET).remove([path])
}
