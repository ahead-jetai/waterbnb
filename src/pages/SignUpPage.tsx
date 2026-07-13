import { SignUp } from '@clerk/clerk-react'

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-16 bg-background">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-medium text-muted mb-2">
          Create your account
        </h1>
        <p className="text-slate-500 text-sm">
          Join WaterBnB to book unique water experiences
        </p>
      </div>
      <SignUp
        routing="hash"
        afterSignUpUrl="/"
        signInUrl="/sign-in"
      />
    </div>
  )
}
