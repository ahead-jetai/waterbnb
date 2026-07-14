import type { ListingFilters } from '../utils/listingsApi'
import { BOAT_TYPE_OPTIONS } from '../data/boatTypes'

type SearchFiltersProps = {
  filters: ListingFilters
  onChange: (filters: ListingFilters) => void
}

export default function SearchFilters({ filters, onChange }: SearchFiltersProps) {
  const update = (patch: Partial<ListingFilters>) => onChange({ ...filters, ...patch })

  const hasActiveFilters =
    !!filters.location || !!filters.boatType || filters.minPrice != null || filters.maxPrice != null || !!filters.checkIn || !!filters.checkOut

  return (
    <div className="card p-4 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="lg:col-span-2">
          <label htmlFor="filter-location" className="block text-xs font-medium text-slate-500 mb-1">Location</label>
          <input
            id="filter-location"
            type="text"
            value={filters.location ?? ''}
            onChange={(e) => update({ location: e.target.value || undefined })}
            placeholder="Where to?"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="filter-checkin" className="block text-xs font-medium text-slate-500 mb-1">Check-in</label>
          <input
            id="filter-checkin"
            type="date"
            value={filters.checkIn ?? ''}
            onChange={(e) => update({ checkIn: e.target.value || undefined })}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="filter-checkout" className="block text-xs font-medium text-slate-500 mb-1">Check-out</label>
          <input
            id="filter-checkout"
            type="date"
            min={filters.checkIn}
            value={filters.checkOut ?? ''}
            onChange={(e) => update({ checkOut: e.target.value || undefined })}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="filter-min-price" className="block text-xs font-medium text-slate-500 mb-1">Min price</label>
          <input
            id="filter-min-price"
            type="number"
            min={0}
            value={filters.minPrice ?? ''}
            onChange={(e) => update({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="$0"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="filter-max-price" className="block text-xs font-medium text-slate-500 mb-1">Max price</label>
          <input
            id="filter-max-price"
            type="number"
            min={0}
            value={filters.maxPrice ?? ''}
            onChange={(e) => update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Any"
            className="input"
          />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <div className="flex-1">
          <label htmlFor="filter-boat-type" className="block text-xs font-medium text-slate-500 mb-1">Boat type</label>
          <select
            id="filter-boat-type"
            value={filters.boatType ?? ''}
            onChange={(e) => update({ boatType: e.target.value || undefined })}
            className="input max-w-xs"
          >
            {BOAT_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => onChange({})}
            className="text-sm text-brand hover:text-brand-dark font-medium bg-transparent border-0 cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
