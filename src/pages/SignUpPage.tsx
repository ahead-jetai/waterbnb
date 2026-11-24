import { SignUp } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { SupportLink } from '../components/SupportLink'

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-16 bg-background">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-medium text-muted mb-2">
          Create your account
        </h1>
        <p className="text-slate-500 text-sm">
          The Los Angeles pilot is invitation-only. Use the invitation sent to you.
        </p>
      </div>
      <SignUp
        routing="hash"
        afterSignUpUrl="/"
        signInUrl="/sign-in"
      />
      <p className="mt-4 text-sm"><SupportLink topic="invite">Request a pilot invitation</SupportLink></p>
      <p className="mt-3 text-sm">Read our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Notice</Link>.</p>
    </div>
  )
}
