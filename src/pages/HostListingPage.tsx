import { useState, useId, useRef, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { uploadListingImage, deleteListingImage } from '../utils/supabase'
import { createListing, updateListing, fetchListing } from '../utils/listingsApi'
import type { Listing } from '../bookingTypes'

// ── Types ──────────────────────────────────────────────────────────────────

interface ListingDraft {
  boatType: string
  title: string
  location: string
  capacity: number
  amenities: string[]
  images: string[]
  description: string
  pricePerNight: number
}

const INITIAL_DRAFT: ListingDraft = {
  boatType: '',
  title: '',
  location: '',
  capacity: 2,
  amenities: [],
  images: [],
  description: '',
  pricePerNight: 200,
}

// ── Constants ──────────────────────────────────────────────────────────────

const BOAT_TYPES = [
  {
    id: 'sailboat', label: 'Sailboat',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 20h18" />
        <path d="M12 3v12" />
        <path d="M12 3L21 15H12" />
        <path d="M12 7L5 15h7" />
      </svg>
    ),
  },
  {
    id: 'houseboat', label: 'Houseboat',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 20h18" />
        <path d="M5 20V13l7-4 7 4v7" />
        <path d="M9 20v-5h6v5" />
      </svg>
    ),
  },
  {
    id: 'yacht', label: 'Yacht',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 18h20" />
        <path d="M4 18c4-2 10-2 16 0" />
        <path d="M8 18v-6h8v6" />
        <path d="M10 12V9h4v3" />
      </svg>
    ),
  },
  {
    id: 'catamaran', label: 'Catamaran',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 19h7" />
        <path d="M15 19h7" />
        <path d="M4 19v-3h3v3" />
        <path d="M17 19v-3h3v3" />
        <path d="M6 16V12h12v4" />
        <path d="M12 12V8" />
      </svg>
    ),
  },
  {
    id: 'motorboat', label: 'Motorboat',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 18h20" />
        <path d="M4 18c4-3 12-3 17-1" />
        <path d="M10 18v-5l6-2v5" />
        <path d="M20 17l2 1" />
      </svg>
    ),
  },
  {
    id: 'other', label: 'Other',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="5" r="2" />
        <path d="M12 7v13" />
        <path d="M8 11h8" />
        <path d="M5 20c0 1 3 1.5 7 1.5s7-.5 7-1.5" />
      </svg>
    ),
  },
]

const AMENITIES = [
  'Wi-Fi', 'Kitchen', 'Air conditioning', 'Heating',
  'Skipper optional', 'Crewed', 'Breakfast', 'Snorkel gear',
  'Harbor view', 'Ocean view', 'City view', 'Beach access',
  'Private cabin', 'Entire boat', 'Romantic', 'Sauna',
]

const STEP_LABELS = ['Your Boat', 'Amenities', 'Photos & Story', 'Pricing']

// ── Progress indicator ─────────────────────────────────────────────────────

function ListingProgress({ current }: { current: number }) {
  return (
    <div className="flex items-start justify-center mb-10" aria-label="Listing progress">
      {STEP_LABELS.map((label, idx) => {
        const step = idx + 1
        const done = current > step
        const active = current === step
        return (
          <div key={label} className="flex items-start">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                ${done ? 'bg-brand text-white' : active ? 'bg-brand text-white ring-4 ring-brand/20' : 'bg-slate-100 text-slate-400'}`}>
                {done ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : step}
              </div>
              <span className={`mt-1.5 text-[11px] font-medium whitespace-nowrap hidden sm:block
                ${active ? 'text-brand' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
            {idx < STEP_LABELS.length - 1 && (
              <div className={`w-10 sm:w-16 lg:w-20 h-0.5 mt-4 mx-1.5 transition-all duration-500
                ${done ? 'bg-brand' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Your Boat ──────────────────────────────────────────────────────

function Step1({ draft, onChange, onNext }: { draft: ListingDraft; onChange: (d: ListingDraft) => void; onNext: () => void }) {
  const canProceed = draft.boatType && draft.title.trim() && draft.location.trim()

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-medium text-muted">What kind of boat is it?</h1>
        <p className="text-slate-500 mt-1 text-sm">Select the type that best describes your vessel.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {BOAT_TYPES.map(bt => (
          <button
            key={bt.id}
            type="button"
            onClick={() => onChange({ ...draft, boatType: bt.id })}
            className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-150 cursor-pointer
              ${draft.boatType === bt.id
                ? 'border-brand bg-brand/5 text-brand'
                : 'border-slate-200 text-slate-500 hover:border-brand/40 hover:text-slate-700'}`}
            aria-pressed={draft.boatType === bt.id}
          >
            <span className="w-10 h-10">{bt.icon}</span>
            <span className="text-xs font-medium">{bt.label}</span>
          </button>
        ))}
      </div>

      <div className="card p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Listing title <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={draft.title}
            onChange={e => onChange({ ...draft, title: e.target.value })}
            className="input"
            placeholder="e.g. Sun-drenched Catamaran in the Med"
            maxLength={80}
          />
          <p className="text-xs text-slate-400 mt-1">{draft.title.length}/80 characters</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Location <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={draft.location}
            onChange={e => onChange({ ...draft, location: e.target.value })}
            className="input"
            placeholder="e.g. Santorini, Greece"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed px-8"
        >
          Next: Amenities
        </button>
      </div>
    </div>
  )
}

// ── Step 2: Amenities ──────────────────────────────────────────────────────

function Step2({ draft, onChange, onNext, onBack }: { draft: ListingDraft; onChange: (d: ListingDraft) => void; onNext: () => void; onBack: () => void }) {
  const toggleAmenity = (a: string) => {
    const next = draft.amenities.includes(a)
      ? draft.amenities.filter(x => x !== a)
      : [...draft.amenities, a]
    onChange({ ...draft, amenities: next })
  }

  const setCapacity = (n: number) => onChange({ ...draft, capacity: Math.max(1, Math.min(20, n)) })

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-medium text-muted">What do you offer?</h1>
        <p className="text-slate-500 mt-1 text-sm">Tell guests what's on board.</p>
      </div>

      <div className="card p-6 mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-4">Maximum guests</label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setCapacity(draft.capacity - 1)}
            disabled={draft.capacity <= 1}
            className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-lg font-medium text-slate-600 hover:border-brand hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Decrease capacity"
          >−</button>
          <span className="font-display text-4xl font-medium text-muted w-12 text-center">{draft.capacity}</span>
          <button
            type="button"
            onClick={() => setCapacity(draft.capacity + 1)}
            disabled={draft.capacity >= 20}
            className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-lg font-medium text-slate-600 hover:border-brand hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Increase capacity"
          >+</button>
          <span className="text-sm text-slate-500">{draft.capacity === 1 ? 'guest' : 'guests'}</span>
        </div>
      </div>

      <div className="card p-6">
        <label className="block text-sm font-medium text-slate-700 mb-4">
          Amenities <span className="text-slate-400 font-normal">(select all that apply)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map(a => {
            const selected = draft.amenities.includes(a)
            return (
              <button
                key={a}
                type="button"
                onClick={() => toggleAmenity(a)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 border
                  ${selected
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand/50 hover:text-brand'}`}
                aria-pressed={selected}
              >
                {a}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-slate-400 mt-3">{draft.amenities.length} selected</p>
      </div>

      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="btn btn-secondary px-6">← Back</button>
        <button onClick={onNext} className="btn btn-primary px-8">Next: Photos & Story</button>
      </div>
    </div>
  )
}

// ── Step 3: Photos & Story ─────────────────────────────────────────────────

function Step3({ draft, onChange, onNext, onBack }: { draft: ListingDraft; onChange: React.Dispatch<React.SetStateAction<ListingDraft>>; onNext: () => void; onBack: () => void }) {
  const [uploadingCount, setUploadingCount] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const uploading = uploadingCount > 0

  // functional updates keep concurrent uploads/deletes from clobbering each other
  const addImage = (url: string) => {
    onChange(d => ({ ...d, images: [...d.images, url] }))
  }

  const addUrl = () => {
    const url = urlDraft.trim()
    if (!url) return
    addImage(url)
    setUrlDraft('')
  }

  const removeImage = (url: string) => {
    onChange(d => ({ ...d, images: d.images.filter(u => u !== url) }))
    // fire-and-forget: clean up storage for uploaded photos
    void deleteListingImage(url)
  }

  const handleFiles = (files: FileList | File[]) => {
    setUploadError(null)
    for (const file of Array.from(files)) {
      setUploadingCount(c => c + 1)
      uploadListingImage(file)
        .then(addImage)
        .catch(err => setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.'))
        .finally(() => setUploadingCount(c => c - 1))
    }
  }

  const canProceed = draft.description.trim().length >= 20

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-medium text-muted">Photos & your story</h1>
        <p className="text-slate-500 mt-1 text-sm">A great photo and description make all the difference.</p>
      </div>

      <div className="card p-6 mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Photos <span className="text-slate-400 font-normal">(the first photo is your cover)</span>
        </label>

        <input
          ref={fileInputRef}
          id={`${id}-file`}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={e => {
            if (e.target.files?.length) handleFiles(e.target.files)
            e.target.value = ''
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault()
            setDragOver(false)
            if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
          }}
          className={`w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 px-4 transition-all duration-150 cursor-pointer
            ${dragOver ? 'border-brand bg-brand/5' : 'border-slate-200 hover:border-brand/50'}`}
        >
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <span className="text-sm font-medium text-slate-600">
            Click to upload <span className="font-normal text-slate-400">or drag and drop — you can add several at once</span>
          </span>
          <span className="text-xs text-slate-400">JPEG, PNG, WebP, GIF, or AVIF — up to 10 MB each</span>
        </button>

        {uploadError && (
          <p className="text-sm text-danger mt-2" role="alert">{uploadError}</p>
        )}

        <button
          type="button"
          onClick={() => setShowUrlInput(v => !v)}
          className="text-xs text-brand hover:text-brand-dark mt-3 bg-transparent border-0 cursor-pointer p-0"
        >
          {showUrlInput ? 'Hide URL option' : 'Or paste an image URL instead'}
        </button>

        {showUrlInput && (
          <div className="mt-2 flex gap-2">
            <input
              id={`${id}-url`}
              type="url"
              value={urlDraft}
              onChange={e => setUrlDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl() } }}
              className="input flex-1"
              placeholder="https://images.unsplash.com/..."
            />
            <button type="button" onClick={addUrl} disabled={!urlDraft.trim()} className="btn btn-secondary disabled:opacity-40">
              Add
            </button>
          </div>
        )}

        {(draft.images.length > 0 || uploading) && (
          <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3" aria-label="Uploaded photos">
            {draft.images.map((url, i) => (
              <li key={url} className="relative group aspect-[4/3] rounded-lg overflow-hidden bg-slate-100">
                <img src={url} alt={`Listing photo ${i + 1}`} className="w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 text-[10px] font-semibold uppercase tracking-wide bg-white/90 text-slate-700 rounded-full px-2 py-0.5">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  aria-label={`Delete photo ${i + 1}`}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
            {uploading && (
              <li className="aspect-[4/3] rounded-lg bg-slate-100 flex flex-col items-center justify-center gap-1.5 text-slate-400">
                <svg className="w-6 h-6 text-brand animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <span className="text-xs">Uploading…</span>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="card p-6">
        <label htmlFor={`${id}-desc`} className="block text-sm font-medium text-slate-700 mb-1.5">
          Description <span className="text-danger">*</span>
        </label>
        <textarea
          id={`${id}-desc`}
          value={draft.description}
          onChange={e => onChange({ ...draft, description: e.target.value })}
          rows={6}
          className="input resize-none"
          placeholder="Describe your boat, the experience guests can expect, nearby attractions, and what makes your listing special..."
          minLength={20}
        />
        <div className="flex justify-between mt-1">
          <p className="text-xs text-slate-400">Minimum 20 characters</p>
          <p className={`text-xs ${draft.description.length < 20 ? 'text-slate-400' : 'text-brand'}`}>
            {draft.description.length} chars
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="btn btn-secondary px-6">← Back</button>
        <button
          onClick={onNext}
          disabled={!canProceed || uploading}
          className="btn btn-primary px-8 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next: Pricing
        </button>
      </div>
    </div>
  )
}

// ── Step 4: Pricing + Review ───────────────────────────────────────────────

function Step4({ draft, onChange, onSubmit, onBack, submitting, submitError, isEdit }: { draft: ListingDraft; onChange: (d: ListingDraft) => void; onSubmit: () => void; onBack: () => void; submitting: boolean; submitError: string | null; isEdit: boolean }) {
  const boatTypeLabel = BOAT_TYPES.find(b => b.id === draft.boatType)?.label ?? ''
  const estimatedMonthly = Math.round(draft.pricePerNight * 10 * 0.88)
  const cover = draft.images[0]

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-medium text-muted">Set your price</h1>
        <p className="text-slate-500 mt-1 text-sm">You can always change it later.</p>
      </div>

      <div className="card p-6 mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-4">Price per night</label>
        <div className="text-center mb-6">
          <span className="font-display text-6xl font-medium text-muted">${draft.pricePerNight}</span>
          <span className="text-slate-400 text-lg"> /night</span>
        </div>
        <input
          type="range"
          min={50} max={1500} step={5}
          value={draft.pricePerNight}
          onChange={e => onChange({ ...draft, pricePerNight: Number(e.target.value) })}
          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-brand bg-slate-200"
          aria-label="Price per night"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1.5 mb-5">
          <span>$50</span><span>$1,500</span>
        </div>
        <div className="bg-brand/5 rounded-lg px-4 py-3 text-sm text-brand">
          At this price, you could earn approx. <strong>${estimatedMonthly.toLocaleString()}/month</strong> hosting 10 nights.
        </div>
      </div>

      {/* Summary preview */}
      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-sm text-slate-700 mb-4">Listing preview</h3>
        <div className="flex gap-4">
          {cover ? (
            <img
              src={cover}
              alt={draft.title}
              className="w-24 h-20 object-cover rounded-lg flex-shrink-0"
              onError={e => { (e.currentTarget as HTMLImageElement).src = '' }}
            />
          ) : (
            <div className="w-24 h-20 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">{draft.title || 'Your listing title'}</p>
            <p className="text-sm text-slate-500 mt-0.5">{draft.location || 'Location'}</p>
            <p className="text-sm text-slate-500 mt-0.5">{boatTypeLabel} · {draft.capacity} {draft.capacity === 1 ? 'guest' : 'guests'}</p>
            <p className="font-display font-semibold text-brand mt-1">${draft.pricePerNight}<span className="text-xs text-slate-400 font-sans">/night</span></p>
          </div>
        </div>
        {draft.amenities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {draft.amenities.slice(0, 5).map(a => (
              <span key={a} className="text-xs rounded-full bg-brand/10 text-brand px-2 py-0.5 font-medium">{a}</span>
            ))}
            {draft.amenities.length > 5 && (
              <span className="text-xs rounded-full bg-slate-100 text-slate-400 px-2 py-0.5">+{draft.amenities.length - 5} more</span>
            )}
          </div>
        )}
      </div>

      {submitError && (
        <p className="text-sm text-danger mt-4" role="alert">{submitError}</p>
      )}

      <div className="mt-6 flex justify-between">
        <button onClick={onBack} disabled={submitting} className="btn btn-secondary px-6 disabled:opacity-40">← Back</button>
        <button onClick={onSubmit} disabled={submitting} className="btn btn-primary px-8 disabled:opacity-40 disabled:cursor-not-allowed">
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Publish listing'}
        </button>
      </div>
    </div>
  )
}

// ── Success state ──────────────────────────────────────────────────────────

function SuccessState({ listing, isEdit }: { listing: Listing; isEdit: boolean }) {
  const boatTypeLabel = BOAT_TYPES.find(b => b.id === listing.boatType)?.label ?? 'Boat'

  return (
    <div className="min-h-screen bg-background">
      <div className="container-p py-16 max-w-2xl text-center">
        <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-6 animate-fade-up">
          <svg className="w-10 h-10 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="font-display text-4xl font-medium text-muted mb-3 animate-fade-up [animation-delay:0.1s]">
          {isEdit ? 'Your changes are saved!' : 'Your listing is live!'}
        </h1>
        <p className="text-slate-500 mb-8 animate-fade-up [animation-delay:0.2s]">
          <strong className="text-slate-700">{listing.title}</strong> is now visible to travelers on WaterBnB.
        </p>

        {/* Preview card */}
        <div className="card p-5 text-left mb-8 animate-fade-up [animation-delay:0.3s]">
          <div className="flex gap-4 items-start">
            {listing.image ? (
              <img src={listing.image} alt={listing.title} className="w-28 h-20 object-cover rounded-lg flex-shrink-0" />
            ) : (
              <div className="w-28 h-20 rounded-lg bg-slate-100 flex-shrink-0" />
            )}
            <div>
              <p className="font-semibold text-slate-900">{listing.title}</p>
              <p className="text-sm text-slate-500 mt-0.5">{listing.location}</p>
              <p className="text-sm text-slate-500 mt-0.5">{boatTypeLabel} · up to {listing.capacity} guests</p>
              <p className="font-display font-semibold text-brand mt-1.5">${listing.pricePerNight}/night</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center animate-fade-up [animation-delay:0.4s]">
          <Link to={`/listing/${listing.id}`} className="btn btn-primary no-underline">
            View your listing
          </Link>
          <Link to="/hosting" className="btn btn-secondary no-underline">
            Go to host dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function HostListingPage() {
  const navigate = useNavigate()
  const { id: editId } = useParams<{ id: string }>()
  const { user } = useUser()
  const isEdit = Boolean(editId)
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<ListingDraft>(INITIAL_DRAFT)
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saved, setSaved] = useState<Listing | null>(null)

  // In edit mode, load the existing listing into the draft
  useEffect(() => {
    if (!editId) return
    let cancelled = false
    fetchListing(editId).then(listing => {
      if (cancelled) return
      if (listing) {
        setDraft({
          boatType: listing.boatType ?? 'other',
          title: listing.title,
          location: listing.location,
          capacity: listing.capacity ?? 2,
          amenities: listing.tags,
          images: listing.images ?? (listing.image ? [listing.image] : []),
          description: listing.description ?? '',
          pricePerNight: listing.pricePerNight,
        })
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [editId])

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const input = { ...draft, hostId: user?.id }
      const listing = editId ? await updateListing(editId, input) : await createListing(input)
      setSaved(listing)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (saved) return <SuccessState listing={saved} isEdit={isEdit} />

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Loading listing…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container-p py-8 max-w-2xl">
        <button
          onClick={() => step === 1 ? navigate('/host') : setStep(s => s - 1)}
          className="text-brand hover:text-brand-dark mb-6 flex items-center gap-1.5 text-sm font-medium bg-transparent border-0 cursor-pointer p-0 no-underline"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {step === 1 ? 'Back to host page' : 'Back'}
        </button>

        <ListingProgress current={step} />

        {step === 1 && <Step1 draft={draft} onChange={setDraft} onNext={() => setStep(2)} />}
        {step === 2 && <Step2 draft={draft} onChange={setDraft} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <Step3 draft={draft} onChange={setDraft} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
        {step === 4 && <Step4 draft={draft} onChange={setDraft} onSubmit={handleSubmit} onBack={() => setStep(3)} submitting={submitting} submitError={submitError} isEdit={isEdit} />}
      </div>
    </div>
  )
}
