import { useState, useId } from 'react'
import { Link, useNavigate } from 'react-router-dom'

// ── Types ──────────────────────────────────────────────────────────────────

interface ListingDraft {
  boatType: string
  title: string
  location: string
  capacity: number
  amenities: string[]
  imageUrl: string
  description: string
  pricePerNight: number
}

const INITIAL_DRAFT: ListingDraft = {
  boatType: '',
  title: '',
  location: '',
  capacity: 2,
  amenities: [],
  imageUrl: '',
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

function Step3({ draft, onChange, onNext, onBack }: { draft: ListingDraft; onChange: (d: ListingDraft) => void; onNext: () => void; onBack: () => void }) {
  const [imgError, setImgError] = useState(false)
  const id = useId()

  const handleUrlChange = (url: string) => {
    setImgError(false)
    onChange({ ...draft, imageUrl: url })
  }

  const canProceed = draft.description.trim().length >= 20

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-medium text-muted">Photos & your story</h1>
        <p className="text-slate-500 mt-1 text-sm">A great photo and description make all the difference.</p>
      </div>

      <div className="card p-6 mb-6">
        <label htmlFor={`${id}-url`} className="block text-sm font-medium text-slate-700 mb-1.5">
          Photo URL
        </label>
        <input
          id={`${id}-url`}
          type="url"
          value={draft.imageUrl}
          onChange={e => handleUrlChange(e.target.value)}
          className="input"
          placeholder="https://images.unsplash.com/..."
        />
        <p className="text-xs text-slate-400 mt-1">Paste a direct image URL. Use Unsplash for high-quality free photos.</p>

        {draft.imageUrl && (
          <div className="mt-4 aspect-[16/9] rounded-lg overflow-hidden bg-slate-100">
            {imgError ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="text-xs">Image could not be loaded</span>
              </div>
            ) : (
              <img
                src={draft.imageUrl}
                alt="Listing preview"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
                onLoad={() => setImgError(false)}
              />
            )}
          </div>
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
          disabled={!canProceed}
          className="btn btn-primary px-8 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next: Pricing
        </button>
      </div>
    </div>
  )
}

// ── Step 4: Pricing + Review ───────────────────────────────────────────────

function Step4({ draft, onChange, onSubmit, onBack }: { draft: ListingDraft; onChange: (d: ListingDraft) => void; onSubmit: () => void; onBack: () => void }) {
  const boatTypeLabel = BOAT_TYPES.find(b => b.id === draft.boatType)?.label ?? ''
  const estimatedMonthly = Math.round(draft.pricePerNight * 10 * 0.88)

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
          {draft.imageUrl ? (
            <img
              src={draft.imageUrl}
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

      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="btn btn-secondary px-6">← Back</button>
        <button onClick={onSubmit} className="btn btn-primary px-8">
          Submit listing
        </button>
      </div>
    </div>
  )
}

// ── Success state ──────────────────────────────────────────────────────────

function SuccessState({ draft }: { draft: ListingDraft }) {
  const navigate = useNavigate()
  const boatTypeLabel = BOAT_TYPES.find(b => b.id === draft.boatType)?.label ?? 'Boat'

  return (
    <div className="min-h-screen bg-background">
      <div className="container-p py-16 max-w-2xl text-center">
        <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-6 animate-fade-up">
          <svg className="w-10 h-10 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="font-display text-4xl font-medium text-muted mb-3 animate-fade-up [animation-delay:0.1s]">
          Your listing is under review!
        </h1>
        <p className="text-slate-500 mb-8 animate-fade-up [animation-delay:0.2s]">
          We'll review <strong className="text-slate-700">{draft.title || `your ${boatTypeLabel}`}</strong> and notify you within 24 hours. In the meantime, browse other listings for inspiration.
        </p>

        {/* Preview card */}
        <div className="card p-5 text-left mb-8 animate-fade-up [animation-delay:0.3s]">
          <div className="flex gap-4 items-start">
            {draft.imageUrl ? (
              <img src={draft.imageUrl} alt={draft.title} className="w-28 h-20 object-cover rounded-lg flex-shrink-0" />
            ) : (
              <div className="w-28 h-20 rounded-lg bg-slate-100 flex-shrink-0" />
            )}
            <div>
              <p className="font-semibold text-slate-900">{draft.title || 'Your listing'}</p>
              <p className="text-sm text-slate-500 mt-0.5">{draft.location}</p>
              <p className="text-sm text-slate-500 mt-0.5">{boatTypeLabel} · up to {draft.capacity} guests</p>
              <p className="font-display font-semibold text-brand mt-1.5">${draft.pricePerNight}/night</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center animate-fade-up [animation-delay:0.4s]">
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Browse listings
          </button>
          <Link to="/host" className="btn btn-secondary no-underline">
            Back to host page
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function HostListingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<ListingDraft>(INITIAL_DRAFT)
  const [submitted, setSubmitted] = useState(false)

  if (submitted) return <SuccessState draft={draft} />

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
        {step === 4 && <Step4 draft={draft} onChange={setDraft} onSubmit={() => setSubmitted(true)} onBack={() => setStep(3)} />}
      </div>
    </div>
  )
}
