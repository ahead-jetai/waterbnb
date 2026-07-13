import type { ReactNode } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-slate-400 text-sm">Loading…</div>
      </div>
    )
  }

  if (!isSignedIn) {
    // Signed-out visitors land on the home page, which carries the
    // register / sign-in calls to action.
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
