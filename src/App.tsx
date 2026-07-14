import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import ListingDetailPage from './pages/ListingDetailPage'
import BookingReviewPage from './pages/BookingReviewPage'
import GuestDetailsPage from './pages/GuestDetailsPage'
import PaymentPage from './pages/PaymentPage'
import BookingConfirmationPage from './pages/BookingConfirmationPage'
import TripsPage from './pages/TripsPage'
import HostAvailabilityPage from './pages/HostAvailabilityPage'
import ProfilePage from './pages/ProfilePage'
import HostProfilePage from './pages/HostProfilePage'
import HostProfileSync from './components/HostProfileSync'
import HostLandingPage from './pages/HostLandingPage'
import HostListingPage from './pages/HostListingPage'
import HostingHomePage from './pages/HostingHomePage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-full flex flex-col">
        <HostProfileSync />
        <Header />
        <Routes>
          {/* Public routes — everything else requires sign-in */}
          <Route path="/" element={<HomePage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />

          {/* Traveler routes */}
          <Route
            path="/listing/:id"
            element={<ProtectedRoute><ListingDetailPage /></ProtectedRoute>}
          />
          <Route
            path="/booking/:listingId/review"
            element={<ProtectedRoute><BookingReviewPage /></ProtectedRoute>}
          />
          <Route
            path="/booking/:listingId/guest-details"
            element={<ProtectedRoute><GuestDetailsPage /></ProtectedRoute>}
          />
          <Route
            path="/booking/:listingId/payment"
            element={<ProtectedRoute><PaymentPage /></ProtectedRoute>}
          />
          <Route
            path="/booking/:listingId/confirmation"
            element={<ProtectedRoute><BookingConfirmationPage /></ProtectedRoute>}
          />
          <Route
            path="/trips"
            element={<ProtectedRoute><TripsPage /></ProtectedRoute>}
          />
          <Route
            path="/profile"
            element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
          />
          <Route
            path="/hosts/:hostId"
            element={<ProtectedRoute><HostProfilePage /></ProtectedRoute>}
          />

          {/* Hosting routes */}
          <Route
            path="/hosting"
            element={<ProtectedRoute><HostingHomePage /></ProtectedRoute>}
          />
          <Route
            path="/host"
            element={<ProtectedRoute><HostLandingPage /></ProtectedRoute>}
          />
          <Route
            path="/host/list"
            element={<ProtectedRoute><HostListingPage /></ProtectedRoute>}
          />
          <Route
            path="/host/list/:id/edit"
            element={<ProtectedRoute><HostListingPage /></ProtectedRoute>}
          />
          <Route
            path="/host/list/:id/availability"
            element={<ProtectedRoute><HostAvailabilityPage /></ProtectedRoute>}
          />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
