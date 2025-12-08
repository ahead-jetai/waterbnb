import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <HomePage />
      <Footer />
    </div>
  )
}
