import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useClerk, useUser } from '@clerk/clerk-react'
import { useUserMode } from '../hooks/useUserMode'
import { fetchHostProfile, updateHostBio } from '../utils/hostProfilesApi'

/** "About you" card: the public bio shown on the user's host profile page. */
function BioCard({ userId }: { userId: string }) {
  const [bio, setBio] = useState('')
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchHostProfile(userId).then(p => { if (!cancelled && p) setBio(p.bio) })
    return () => { cancelled = true }
  }, [userId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await updateHostBio(userId, draft.trim())
      setBio(draft.trim())
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your bio.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-6 mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-base">About you</h2>
        {!editing && (
          <button
            onClick={() => { setDraft(bio); setEditing(true) }}
            className="text-sm text-brand hover:text-brand-dark font-medium bg-transparent border-0 cursor-pointer"
          >
            {bio ? 'Edit bio' : 'Add bio'}
          </button>
        )}
      </div>
      {!editing ? (
        bio ? (
          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{bio}</p>
        ) : (
          <p className="text-slate-400 text-sm">
            Tell guests a little about yourself — shown on your public host profile.
          </p>
        )
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={4}
            maxLength={600}
            placeholder="I love being out on the water…"
            className="input resize-y"
            aria-label="Bio"
          />
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary text-sm py-2" disabled={saving}>
              {saving ? 'Saving…' : 'Save bio'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn btn-secondary text-sm py-2">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function MenuItem({
  to,
  onClick,
  icon,
  title,
  subtitle,
  danger = false,
}: {
  to?: string
  onClick?: () => void
  icon: React.ReactNode
  title: string
  subtitle: string
  danger?: boolean
}) {
  const content = (
    <>
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${danger ? 'bg-danger/10 text-danger' : 'bg-brand/10 text-brand'}`}>
        {icon}
      </span>
      <span className="flex-1 text-left">
        <span className={`block font-medium ${danger ? 'text-danger' : 'text-slate-900'}`}>{title}</span>
        <span className="block text-sm text-slate-500 mt-0.5">{subtitle}</span>
      </span>
      <ChevronIcon />
    </>
  )
  const className =
    'w-full flex items-center gap-4 p-4 rounded-xl bg-white ring-1 ring-black/5 shadow-card hover:shadow-card-hover transition-shadow no-underline cursor-pointer border-0 text-base font-sans'

  if (to) {
    return <Link to={to} className={className}>{content}</Link>
  }
  return <button onClick={onClick} className={className}>{content}</button>
}

export default function ProfilePage() {
  const { user } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const { mode, setMode } = useUserMode()
  const navigate = useNavigate()

  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'WaterBnB member'
  const phone = user.primaryPhoneNumber?.phoneNumber
  const email = user.primaryEmailAddress?.emailAddress
  const joined = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError('')
    setSaving(true)
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() })
      setEditing(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not update your name.')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    setPhotoError('')
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Please choose an image under 10 MB.')
      return
    }
    setUploadingPhoto(true)
    try {
      await user.setProfileImage({ file })
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not upload your photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSwitchMode = async () => {
    const next = mode === 'hosting' ? 'traveling' : 'hosting'
    await setMode(next)
    navigate(next === 'hosting' ? '/hosting' : '/')
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <main className="bg-background min-h-screen">
      <div className="container-p py-10 max-w-2xl">
        {/* Identity card */}
        <div className="card p-6 sm:p-8 mb-8 text-center">
          <div className="relative inline-block">
            <img
              src={user.imageUrl}
              alt={fullName}
              className={`w-24 h-24 rounded-full object-cover ring-4 ring-brand/20 ${uploadingPhoto ? 'opacity-50' : ''}`}
            />
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              aria-label="Change profile photo"
              title="Change profile photo"
              className="absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white shadow hover:bg-brand-dark cursor-pointer border-2 border-white disabled:opacity-60"
            >
              {uploadingPhoto ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelected}
              className="hidden"
              aria-label="Upload profile photo"
            />
          </div>
          {photoError && <p className="text-sm text-danger mt-2" role="alert">{photoError}</p>}
          {!editing ? (
            <>
              <h1 className="font-display text-3xl font-medium text-muted mt-4">{fullName}</h1>
              <div className="text-sm text-slate-500 mt-1 space-x-2">
                {phone && <span>{phone}</span>}
                {email && <span>{email}</span>}
              </div>
              {joined && <p className="text-xs text-slate-400 mt-2">WaterBnB member since {joined}</p>}
              <span className="inline-block mt-3 rounded-full bg-brand/10 text-brand text-xs font-medium px-3 py-1">
                {mode === 'hosting' ? 'Hosting mode' : 'Traveling mode'}
              </span>
              <div className="mt-4">
                <button
                  onClick={() => {
                    setFirstName(user.firstName ?? '')
                    setLastName(user.lastName ?? '')
                    setEditing(true)
                  }}
                  className="text-sm text-brand hover:text-brand-dark font-medium bg-transparent border-0 cursor-pointer"
                >
                  Edit name
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSaveName} className="mt-5 max-w-sm mx-auto space-y-3 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="profile-first" className="block text-sm font-medium text-slate-700 mb-1.5">First name</label>
                  <input
                    id="profile-first"
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="profile-last" className="block text-sm font-medium text-slate-700 mb-1.5">Last name</label>
                  <input
                    id="profile-last"
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
              {saveError && <p className="text-sm text-danger" role="alert">{saveError}</p>}
              <div className="flex gap-2 justify-center pt-1">
                <button type="submit" className="btn btn-primary text-sm py-2" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setEditing(false)} className="btn btn-secondary text-sm py-2">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <BioCard userId={user.id} />

        {/* Menu */}
        <div className="space-y-3">
          <MenuItem
            to="/trips"
            title="My Trips"
            subtitle="Upcoming and past bookings"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
              </svg>
            }
          />
          {mode === 'hosting' && (
            <MenuItem
              to="/hosting"
              title="Hosting dashboard"
              subtitle="Manage your listings, calendars, and earnings"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" />
                </svg>
              }
            />
          )}
          <MenuItem
            onClick={handleSwitchMode}
            title={mode === 'hosting' ? 'Switch to traveling' : 'Switch to hosting'}
            subtitle={mode === 'hosting' ? 'Browse and book boats as a guest' : 'List your boat and start earning'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
              </svg>
            }
          />
          <MenuItem
            onClick={() => openUserProfile()}
            title="Account & security"
            subtitle="Phone number, connected accounts, sessions"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          />
          <MenuItem
            onClick={handleSignOut}
            danger
            title="Sign out"
            subtitle="Log out of WaterBnB on this device"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            }
          />
        </div>
      </div>
    </main>
  )
}
