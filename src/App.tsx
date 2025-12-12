import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import ListingDetailPage from './pages/ListingDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-full flex flex-col">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/listing/:id" element={<ListingDetailPage />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
