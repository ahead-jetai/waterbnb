import { useUser } from '@clerk/clerk-react'

export type UserMode = 'traveling' | 'hosting'

/**
 * The user's active app mode (traveling vs hosting), persisted on the
 * Clerk user's unsafeMetadata so it follows them across devices.
 * Defaults to 'traveling' for new users.
 */
export function useUserMode() {
  const { user, isLoaded } = useUser()

  const mode: UserMode = user?.unsafeMetadata?.mode === 'hosting' ? 'hosting' : 'traveling'

  const setMode = async (next: UserMode) => {
    if (!user) return
    await user.update({ unsafeMetadata: { ...user.unsafeMetadata, mode: next } })
  }

  return { mode, setMode, isLoaded }
}
