# WaterBnB Project

## Project Overview
WaterBnB is a vacation rental platform specializing in unique water-based accommodations such as houseboats, sailboat cabins, and floating homes. Built with React, TypeScript, and TailwindCSS.

## Tech Stack
- **Frontend Framework**: React 19.2.0
- **Build Tool**: Vite 6.0.0
- **Language**: TypeScript
- **Styling**: TailwindCSS 3.4.15
- **Routing**: React Router DOM 7.1.1
- **Linting**: ESLint with TypeScript support

## Project Structure
```
water-bnb/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Header.tsx       # Navigation header with logo and menu
│   │   ├── Footer.tsx       # Site footer
│   │   ├── Hero.tsx         # Hero section component
│   │   ├── Carousel.tsx     # Image carousel component
│   │   ├── ListingCard.tsx  # Individual listing card (clickable)
│   │   ├── StarRating.tsx   # Star rating display component
│   │   └── Login.tsx        # Login modal/form
│   ├── pages/               # Page components
│   │   ├── HomePage.tsx     # Main landing page with listing grid
│   │   └── ListingDetailPage.tsx  # Individual listing detail page
│   ├── data/
│   │   └── listings.ts      # Mock listing data (10 items)
│   ├── types.ts             # TypeScript type definitions
│   ├── App.tsx              # Root app component with routing
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles and Tailwind imports
├── public/                  # Static assets
├── .aiassistant/           # AI assistant configuration
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── eslint.config.js
```

## Key Features

### 1. Listing Display
- Responsive grid layout (1-4 columns based on screen size)
- 10 mock listings with real images from Unsplash
- Each listing shows: image, title, location, price, rating, reviews, tags

### 2. Clickable Listings with Routing
- Each listing card is clickable and navigates to a unique URL
- URL pattern: `/listing/:id` (e.g., `/listing/l1`, `/listing/l2`)
- Implemented using React Router DOM with `BrowserRouter`
- Direct URL access supported for bookmarking/sharing

### 3. Listing Detail Pages
- Full-width hero image
- Complete listing information (title, location, price, rating, reviews)
- Amenities/tags display
- About section with generated description
- Booking form with date pickers and guest selection
- Sticky booking card on desktop viewports
- Breadcrumb navigation back to listings
- 404 handling for invalid listing IDs

### 4. Header Navigation
- Sticky header with logo and navigation links
- Logo links back to home page using React Router
- Mobile-responsive with hamburger menu
- Desktop navigation with Explore, Host a Boat, About links

## Data Model

### Listing Type
```typescript
type Listing = {
  id: string           // Unique identifier (e.g., 'l1', 'l2')
  title: string        // Listing title
  location: string     // City, Country
  pricePerNight: number
  rating: number       // 0-5 rating
  reviews: number      // Number of reviews
  image: string        // Image URL (Unsplash)
  tags: string[]       // Amenities/features
}
```

## Routing Configuration

### Routes
- `/` - Home page with listing grid
- `/listing/:id` - Individual listing detail page

### Navigation Components
- `<BrowserRouter>` wraps the entire app in `App.tsx`
- `<Link>` components used for navigation (Header logo, ListingCard)
- `useParams` hook used to extract listing ID from URL

## Styling Approach
- TailwindCSS utility classes for all styling
- Custom CSS classes in `index.css`:
  - `.card` - Base card styling
  - `.btn`, `.btn-primary` - Button styles
  - `.container-p` - Container padding utility
  - `--brand` color: `#0ea5e9` (sky-500)
- Responsive design with mobile-first approach
- Hover effects on interactive elements

## Development Commands
```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## Recent Changes
- ✅ Installed react-router-dom for client-side routing
- ✅ Created ListingDetailPage component with full listing details
- ✅ Set up routing in App.tsx with BrowserRouter and Routes
- ✅ Made ListingCard components clickable with React Router Links
- ✅ Updated Header logo to use React Router Link for navigation
- ✅ Added hover effects and transitions for better UX

## Git Status
- Current branch: `main`
- Recent commits include ESLint and TailwindCSS configurations
- Modified files pending commit: routing implementation and new components

## Future Enhancements
- User authentication and login functionality
- Real booking system with date validation
- Search and filter functionality for listings
- Host dashboard for managing listings
- User reviews and ratings system
- Payment integration
- Image galleries for listings
- Map integration for locations
- Favorites/wishlist feature
