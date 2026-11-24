import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

export const supportEmail = 'ahead747@gmail.com'

export function SupportLink({ children = 'Contact support', topic, reference, className }: {
  children?: ReactNode
  topic?: 'cancellation' | 'invite' | 'privacy' | 'safety'
  reference?: string
  className?: string
}) {
  const params = new URLSearchParams()
  if (topic) params.set('topic', topic)
  if (reference) params.set('reference', reference)
  return <Link className={className} to={params.size ? `/support?${params}` : '/support'}>{children}</Link>
}
