import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import ListingDetailPage from './pages/ListingDetailPage'
import BookingReviewPage from './pages/BookingReviewPage'
import GuestDetailsPage from './pages/GuestDetailsPage'
import PaymentPage from './pages/PaymentPage'
import BookingConfirmationPage from './pages/BookingConfirmationPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-full flex flex-col">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/listing/:id" element={<ListingDetailPage />} />
          <Route path="/booking/:listingId/review" element={<BookingReviewPage />} />
          <Route path="/booking/:listingId/guest-details" element={<GuestDetailsPage />} />
          <Route path="/booking/:listingId/payment" element={<PaymentPage />} />
          <Route path="/booking/:listingId/confirmation" element={<BookingConfirmationPage />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
