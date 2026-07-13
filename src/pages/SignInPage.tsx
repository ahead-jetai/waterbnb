import { SignIn } from '@clerk/clerk-react'
import { useLocation } from 'react-router-dom'

export default function SignInPage() {
  const location = useLocation()
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? '/'

  return (
    <div className="flex flex-col items-center justify-center flex-1 py-16 bg-background">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-medium text-muted mb-2">
          Welcome back
        </h1>
        <p className="text-slate-500 text-sm">
          Sign in to continue your booking
        </p>
      </div>
      <SignIn
        routing="hash"
        afterSignInUrl={returnTo}
        signUpUrl="/sign-up"
      />
    </div>
  )
}
