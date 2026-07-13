import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockUpdate = vi.fn()
const clerkState: { user: Record<string, unknown> | null; isLoaded: boolean } = {
  user: null,
  isLoaded: true,
}

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: clerkState.user, isLoaded: clerkState.isLoaded }),
}))

import { useUserMode } from '../hooks/useUserMode'

describe('useUserMode', () => {
  beforeEach(() => {
    mockUpdate.mockReset()
    clerkState.user = { unsafeMetadata: {}, update: mockUpdate }
    clerkState.isLoaded = true
  })

  it('defaults to traveling mode', () => {
    const { result } = renderHook(() => useUserMode())
    expect(result.current.mode).toBe('traveling')
  })

  it('reads hosting mode from unsafeMetadata', () => {
    clerkState.user = { unsafeMetadata: { mode: 'hosting' }, update: mockUpdate }
    const { result } = renderHook(() => useUserMode())
    expect(result.current.mode).toBe('hosting')
  })

  it('persists the new mode via user.update, preserving other metadata', async () => {
    clerkState.user = { unsafeMetadata: { favoriteColor: 'blue' }, update: mockUpdate }
    const { result } = renderHook(() => useUserMode())
    await act(() => result.current.setMode('hosting'))
    expect(mockUpdate).toHaveBeenCalledWith({
      unsafeMetadata: { favoriteColor: 'blue', mode: 'hosting' },
    })
  })

  it('is a no-op when there is no user', async () => {
    clerkState.user = null
    const { result } = renderHook(() => useUserMode())
    await act(() => result.current.setMode('hosting'))
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(result.current.mode).toBe('traveling')
  })
})
