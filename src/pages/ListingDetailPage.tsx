import { useParams, Link } from 'react-router-dom';
import { listings } from '../data/listings';
import StarRating from '../components/StarRating';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const listing = listings.find(l => l.id === id);

  if (!listing) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Listing Not Found</h1>
        <p className="text-gray-600 mb-8">The listing you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link to="/" className="text-blue-600 hover:text-blue-800">
          ← Back to listings
        </Link>
      </nav>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Images and Details */}
        <div className="lg:col-span-2">
          {/* Main Image */}
          <div className="aspect-[16/9] bg-slate-100 overflow-hidden rounded-lg mb-6">
            <img
              src={listing.image}
              alt={`${listing.title} — ${listing.location}`}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Title and Location */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
            <p className="text-lg text-gray-600 mb-3">{listing.location}</p>
            <div className="flex items-center gap-4">
              <StarRating value={listing.rating} count={listing.reviews} />
            </div>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">What this place offers</h2>
            <div className="flex flex-wrap gap-2">
              {listing.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">About this listing</h2>
            <p className="text-gray-700 leading-relaxed">
              Experience the unique charm of staying on the water in {listing.location}.
              This {listing.title.toLowerCase()} offers a one-of-a-kind accommodation that
              combines comfort with adventure. Perfect for travelers looking for something
              different from traditional hotels.
            </p>
          </div>

          {/* Additional Info */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-3">Things to know</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Check-in</h3>
                <p className="text-gray-600">After 3:00 PM</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Check-out</h3>
                <p className="text-gray-600">Before 11:00 AM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Booking Card */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <div className="mb-4">
              <div className="text-2xl font-bold">
                ${listing.pricePerNight}
                <span className="text-base font-normal text-gray-600"> / night</span>
              </div>
            </div>

            <div className="mb-4">
              <StarRating value={listing.rating} count={listing.reviews} />
            </div>

            {/* Booking Form */}
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Check-in</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Check-out</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Guests</label>
                <select className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>1 guest</option>
                  <option>2 guests</option>
                  <option>3 guests</option>
                  <option>4 guests</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full">
                Reserve
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-4">
              You won't be charged yet
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
