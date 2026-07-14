import { useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { syncHostProfile } from '../utils/hostProfilesApi'

/** Mirrors the signed-in user's public name/avatar into Supabase so their host profile stays fresh. */
export default function HostProfileSync() {
  const { user } = useUser()
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ')
  const imageUrl = user?.imageUrl ?? ''

  useEffect(() => {
    if (!user?.id) return
    syncHostProfile(user.id, name, imageUrl)
  }, [user?.id, name, imageUrl])

  return null
}
