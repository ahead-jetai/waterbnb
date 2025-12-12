import StarRating from './StarRating'
import type { Listing } from '../types'

type Props = {
  item: Listing
}

export default function ListingCard({ item }: Props) {
  return (
    <article className="card overflow-hidden" aria-label={`${item.title} in ${item.location}`}>
      <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
        <img
          src={item.image}
          alt={`${item.title} — ${item.location}`}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).src = '/placeholder.svg'
          }}
        />
      </div>
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900 leading-snug">
            {item.title}
          </h3>
          <span className="text-brand font-semibold">${item.pricePerNight}/night</span>
        </div>
        <p className="text-sm text-slate-600">{item.location}</p>
        <StarRating value={item.rating} count={item.reviews} />
        <div className="mt-1 flex flex-wrap gap-2">
          {item.tags.map((t) => (
            <span key={t} className="text-xs rounded-full bg-brand/10 text-brand px-2 py-1">
              {t}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}
