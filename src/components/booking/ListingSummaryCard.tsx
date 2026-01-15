import type { Listing } from '../../bookingTypes'

type ListingSummaryCardProps = {
  listing: Listing
  variant?: 'compact' | 'horizontal'
  className?: string
}

export default function ListingSummaryCard({
  listing,
  variant = 'horizontal',
  className = ''
}: ListingSummaryCardProps) {
  const imageClasses = variant === 'compact'
    ? 'w-full h-48 object-cover rounded-lg mb-4'
    : 'w-32 h-32 object-cover rounded-lg'

  const content = (
    <>
      <h3 className="font-semibold text-lg mb-1">{listing.title}</h3>
      <p className="text-gray-600 mb-2">{listing.location}</p>
      <div className="flex items-center gap-2">
        <span className="text-yellow-500">★</span>
        <span className="font-semibold">{listing.rating}</span>
        <span className="text-gray-600 text-sm">({listing.reviews} reviews)</span>
      </div>
    </>
  )

  if (variant === 'compact') {
    return (
      <div className={className}>
        <img
          src={listing.image}
          alt={listing.title}
          className={imageClasses}
        />
        {content}
      </div>
    )
  }

  return (
    <div className={`flex gap-4 ${className}`}>
      <img
        src={listing.image}
        alt={listing.title}
        className={imageClasses}
      />
      <div>{content}</div>
    </div>
  )
}
