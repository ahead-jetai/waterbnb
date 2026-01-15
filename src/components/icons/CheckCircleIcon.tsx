type CheckCircleIconProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20'
}

const iconSizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10'
}

export default function CheckCircleIcon({ className = '', size = 'lg' }: CheckCircleIconProps) {
  return (
    <div className={`inline-flex items-center justify-center ${sizeClasses[size]} bg-green-100 rounded-full ${className}`}>
      <svg
        className={`${iconSizeClasses[size]} text-green-500`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    </div>
  )
}
