import type { ReactNode } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Navigate, useLocation } from 'react-router-dom'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded } = useAuth()
  const location = useLocation()

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-slate-400 text-sm">Loading…</div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <Navigate
        to="/sign-in"
        state={{ returnTo: location.pathname + location.search }}
        replace
      />
    )
  }

  return <>{children}</>
}
