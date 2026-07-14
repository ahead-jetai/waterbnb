import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { fetchListing } from '../utils/listingsApi';
import { fetchBookedDateRanges, rangesOverlap } from '../utils/bookingsApi';
import StarRating from '../components/StarRating';
import type { BookingData, Listing } from '../bookingTypes';

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
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [bookedRanges, setBookedRanges] = useState<{ checkIn: string; checkOut: string }[]>([]);
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchListing(id).then(l => {
      if (!cancelled) {
        setListing(l);
        setLoading(false);
      }
    });
    fetchBookedDateRanges(id).then(ranges => {
      if (!cancelled) setBookedRanges(ranges);
    });
    return () => { cancelled = true };
  }, [id]);

  const formatShort = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <div className="container-p py-16 flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Loading listing…</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container-p py-16 text-center">
        <h1 className="font-display text-3xl font-semibold mb-4">Listing Not Found</h1>
        <p className="text-slate-500 mb-8">The listing you're looking for doesn't exist.</p>
        <Link to="/" className="btn btn-primary no-underline">
          Back to Home
        </Link>
      </div>
    );
  }

  const handleReserve = (e: React.FormEvent) => {
    e.preventDefault();
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
      setDateError('Those dates overlap an existing booking for this listing. Please choose different dates.');
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

          <div className="border-t border-slate-100 pt-6">
            <h2 className="font-display text-xl font-medium text-muted mb-4">Things to know</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Check-in</h3>
                <p className="text-slate-500 text-sm">After 3:00 PM</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Check-out</h3>
                <p className="text-slate-500 text-sm">Before 11:00 AM</p>
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

            <form onSubmit={handleReserve} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Check-in</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Check-out</label>
                <input
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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Guests</label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(parseInt(e.target.value))}
                  className="input"
                >
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary w-full mt-2">
                Reserve
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-4">
              You won't be charged yet
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
