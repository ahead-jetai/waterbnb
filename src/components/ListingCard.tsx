import { Link } from 'react-router-dom'
import StarRating from './StarRating'
import type { Listing } from '../bookingTypes'

type Props = {
  item: Listing
}

export default function ListingCard({ item }: Props) {
  return (
    <Link to={`/listing/${item.id}`} className="block group no-underline">
      <article className="card overflow-hidden hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5" aria-label={`${item.title} in ${item.location}`}>
        <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
          <img
            src={item.image}
            alt={`${item.title} — ${item.location}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).src = '/placeholder.svg'
            }}
          />
          {/* Gradient for badge legibility */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          {/* Price badge */}
          <div className="absolute bottom-3 left-3">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg px-2.5 py-1 shadow-sm">
              <span className="font-display font-semibold text-sm text-muted">${item.pricePerNight}</span>
              <span className="text-xs text-slate-400 ml-0.5">/night</span>
            </div>
          </div>
        </div>
        <div className="p-4 flex flex-col gap-1.5">
          <h3 className="font-semibold text-slate-900 leading-snug line-clamp-1">
            {item.title}
          </h3>
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <svg className="w-3 h-3 text-brand flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {item.location}
          </p>
          <StarRating value={item.rating} count={item.reviews} />
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            {item.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-xs rounded-full bg-brand/10 text-brand px-2 py-0.5 font-medium">
                {t}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-xs rounded-full bg-slate-100 text-slate-400 px-2 py-0.5">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
