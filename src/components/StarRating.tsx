type Props = {
  value: number // 0..5
  count?: number
}

export default function StarRating({ value, count }: Props) {
  const full = Math.floor(value)
  const half = value - full >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return (
    <div className="inline-flex items-center gap-1" aria-label={`Rated ${value} out of 5${count ? ` from ${count} reviews` : ''}`}>
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} variant="full" />
      ))}
      {half && <Star variant="half" />}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} variant="empty" />
      ))}
      <span className="text-sm text-slate-600">{value.toFixed(2)}</span>
      {typeof count === 'number' && <span className="text-sm text-slate-500">({count})</span>}
    </div>
  )
}

function Star({ variant }: { variant: 'full' | 'half' | 'empty' }) {
  const fill = variant === 'empty' ? 'none' : 'currentColor'
  const gradientId = 'grad-half'
  return (
    <svg aria-hidden="true" className="h-4 w-4 text-amber-500" viewBox="0 0 20 20">
      {variant === 'half' && (
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1">
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M10 15.27 16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z"
        fill={variant === 'half' ? `url(#${gradientId})` : fill}
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  )
}
