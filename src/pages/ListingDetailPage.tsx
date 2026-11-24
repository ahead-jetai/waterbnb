import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { fetchListing } from '../utils/listingsApi';
import { fetchUnavailableRanges, rangesOverlap, type UnavailableRange } from '../utils/bookingsApi';
import { fetchHostProfile, type HostProfile } from '../utils/hostProfilesApi';
import StarRating from '../components/StarRating';
import type { BookingData, Listing } from '../bookingTypes';
import { bookingModeLabel, bookingModeSummary } from '../utils/bookingMode';
import { fetchPilotAccess } from '../utils/paymentsApi';
import { SupportLink } from '../components/SupportLink';

/** Clickable host byline that lands on the host's public profile page. */
function HostCard({ hostId, profile }: { hostId: string; profile: HostProfile | null }) {
  const name = profile?.name || 'WaterBnB host';
  return (
    <Link
      to={`/hosts/${hostId}`}
      className="flex items-center gap-3 no-underline group border-t border-slate-100 pt-6 mt-6"
      aria-label={`View ${name}'s profile and listings`}
    >
      {profile?.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt=""
          className="w-12 h-12 rounded-full object-cover ring-2 ring-brand/20 group-hover:ring-brand/50 transition-shadow flex-shrink-0"
        />
      ) : (
        <span className="inline-flex w-12 h-12 rounded-full bg-brand/10 text-brand items-center justify-center font-display text-lg flex-shrink-0">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span>
        <span className="block font-semibold text-slate-900 group-hover:text-brand transition-colors">
          Hosted by {name}
        </span>
        <span className="block text-sm text-slate-500 mt-0.5">View profile and all listings</span>
      </span>
    </Link>
  );
}

function PhotoGallery({ listing }: { listing: Listing }) {
  const photos = listing.images?.length ? listing.images : [listing.image];
  const [index, setIndex] = useState(0);

  return (
    <div className="mb-6">
      <div className="relative aspect-[16/9] bg-slate-100 overflow-hidden rounded-xl">
        <img
          src={photos[index]}
          alt={`${listing.title} — photo ${index + 1} of ${photos.length}`}
          className="w-full h-full object-cover"
        />
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setIndex(i => (i - 1 + photos.length) % photos.length)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-muted shadow hover:bg-white cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4 6 10l6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => setIndex(i => (i + 1) % photos.length)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-muted shadow hover:bg-white cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="absolute bottom-3 right-3 text-xs font-medium bg-black/60 text-white rounded-full px-2.5 py-1">
              {index + 1} / {photos.length}
            </span>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button
              key={p}
              onClick={() => setIndex(i)}
              aria-label={`View photo ${i + 1}`}
              className={`w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer
                ${i === index ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100'}`}
            >
              <img src={p} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [listingError, setListingError] = useState<string | null>(null);
  const [bookingAccess, setBookingAccess] = useState<{ id: string; status: 'allowed' | 'denied' | 'error' } | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [bookedRanges, setBookedRanges] = useState<UnavailableRange[]>([]);
  const [dateError, setDateError] = useState('');
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([fetchListing(id), fetchUnavailableRanges(id)]).then(([l, ranges]) => {
      if (!cancelled) {
        setListingError(null);
        setListing(l);
        setBookedRanges(ranges);
        setHostProfile(null);
        setLoading(false);
        if (l?.hostId) {
          fetchHostProfile(l.hostId).then(p => { if (!cancelled) setHostProfile(p) });
        }
      }
    }).catch(() => {
      if (!cancelled) {
        setListingError("We couldn't load this live listing or its availability.");
        setLoading(false);
      }
    });
    return () => { cancelled = true };
  }, [id]);

  const accessId = listing?.id === id ? id : undefined;
  useEffect(() => {
    if (!accessId) return;
    let cancelled = false;
    fetchPilotAccess(getToken, accessId).then(eligible => {
      if (!cancelled) setBookingAccess({ id: accessId, status: eligible ? 'allowed' : 'denied' });
    }).catch(() => {
      if (!cancelled) setBookingAccess({ id: accessId, status: 'error' });
    });
    return () => { cancelled = true };
  }, [accessId, getToken]);

  const formatShort = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <div className="container-p py-16 flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Loading listing…</div>
      </div>
    );
  }

  if (listingError || !listing) {
    return (
      <div className="container-p py-16 text-center">
        <h1 className="font-display text-3xl font-semibold mb-4">{listingError ? 'Listing temporarily unavailable' : 'Listing not available'}</h1>
        <p className="text-slate-500 mb-8" role={listingError ? 'alert' : undefined}>
          {listingError ?? 'This listing is not in the live pilot catalog.'}
        </p>
        <Link to="/" className="btn btn-primary no-underline">
          Back to Home
        </Link>
      </div>
    );
  }

  const access = bookingAccess?.id === listing.id ? bookingAccess.status : 'loading';
  const handleReserve = (e: React.FormEvent) => {
    e.preventDefault();
    if (access !== 'allowed' || listing.id !== id) return;
    setDateError('');

    if (!checkIn || !checkOut) {
      alert('Please select check-in and check-out dates');
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkOutDate <= checkInDate) {
      alert('Check-out date must be after check-in date');
      return;
    }

    const overlapping = bookedRanges.some(r => rangesOverlap(checkIn, checkOut, r.checkIn, r.checkOut));
    if (overlapping) {
      setDateError('Those dates are unavailable for this listing. Please choose different dates.');
      return;
    }

    const bookingData: BookingData = {
      listingId: listing.id,
      dates: { checkIn, checkOut },
      guests
    };

    navigate(`/booking/${listing.id}/review`, { state: { bookingData } });
  };

  return (
    <div className="container-p py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center justify-between">
        <Link to="/" className="text-brand hover:text-brand-dark no-underline inline-flex items-center gap-1.5 text-sm font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to listings
        </Link>
        {listing.hostId && user?.id === listing.hostId && (
          <Link to={`/host/list/${listing.id}/edit`} className="btn btn-secondary no-underline text-sm py-1.5 px-4">
            Edit listing
          </Link>
        )}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2">
          <PhotoGallery listing={listing} />

          <div className="mb-6">
            <h1 className="font-display text-3xl sm:text-4xl font-medium text-muted mb-2">{listing.title}</h1>
            <p className="text-slate-500 flex items-center gap-1.5 mb-3">
              <svg className="w-4 h-4 text-brand flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              {listing.location}
            </p>
            <StarRating value={listing.rating} count={listing.reviews} />
          </div>

          <div className="mb-6">
            <h2 className="font-display text-xl font-medium text-muted mb-3">What this place offers</h2>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                {bookingModeLabel(listing)}
              </span>
              {listing.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="font-display text-xl font-medium text-muted mb-3">About this listing</h2>
            <p className="text-slate-600 leading-relaxed">
              {listing.description || `Experience the unique charm of staying on the water in ${listing.location}.
              This ${listing.title.toLowerCase()} offers a one-of-a-kind accommodation that
              combines comfort with adventure. Perfect for travelers looking for something
              different from traditional hotels.`}
            </p>
          </div>

          {listing.hostId && (
            <div className="mb-6">
              <HostCard hostId={listing.hostId} profile={hostProfile} />
            </div>
          )}

          <div className="border-t border-slate-100 pt-6">
            <h2 className="font-display text-xl font-medium text-muted mb-4">Things to know</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Check-in</h3>
                <p className="text-slate-500 text-sm">Confirm boarding details with your host. Your local-time refund cutoff appears in Checkout.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Check-out</h3>
                <p className="text-slate-500 text-sm">Follow the host's checkout and marina instructions.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Booking approval</h3>
                <p className="text-slate-500 text-sm">{bookingModeSummary(listing)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Booking Card */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <div className="mb-4">
              <div className="font-display text-3xl font-medium text-muted">
                ${listing.pricePerNight}
                <span className="text-base font-sans font-normal text-slate-500"> / night</span>
              </div>
            </div>

            <div className="mb-5">
              <StarRating value={listing.rating} count={listing.reviews} />
            </div>

            {access === 'allowed' ? <form onSubmit={handleReserve} className="space-y-4">
              <div>
                <label htmlFor="listing-check-in" className="block text-sm font-medium text-slate-700 mb-1.5">Check-in</label>
                <input
                  id="listing-check-in"
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input"
                  required
                />
              </div>
              <div>
                <label htmlFor="listing-check-out" className="block text-sm font-medium text-slate-700 mb-1.5">Check-out</label>
                <input
                  id="listing-check-out"
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  min={checkIn || new Date().toISOString().split('T')[0]}
                  className="input"
                  required
                />
              </div>
              {dateError && (
                <p className="text-sm text-danger" role="alert">{dateError}</p>
              )}
              {bookedRanges.length > 0 && (
                <div className="text-xs text-slate-400">
                  <span className="font-medium text-slate-500">Unavailable: </span>
                  {bookedRanges.map((r, i) => (
                    <span key={i}>
                      {formatShort(r.checkIn)} – {formatShort(r.checkOut)}
                      {i < bookedRanges.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              )}
              <div>
                <label htmlFor="listing-guests" className="block text-sm font-medium text-slate-700 mb-1.5">Guests</label>
                <select
                  id="listing-guests"
                  value={guests}
                  onChange={(e) => setGuests(parseInt(e.target.value))}
                  className="input"
                >
                  {Array.from({ length: listing.capacity ?? 1 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary w-full mt-2">
                Reserve
              </button>
            </form> : (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700" role={access === 'error' ? 'alert' : 'status'}>
                {access === 'loading' ? 'Checking pilot access…'
                  : access === 'error' ? <>We couldn't verify booking access. <SupportLink />.</>
                  : <>Bookings are invitation-only and may be paused. <SupportLink topic="invite">Ask about the pilot</SupportLink>.</>}
              </p>
            )}

            <p className="text-center text-xs text-slate-400 mt-4">
              <Link to="/cancellation">Cancellation and refunds</Link> · <Link to="/safety">Safety guidance</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
