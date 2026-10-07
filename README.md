# WaterBnB

A vacation rental platform specializing in unique water-based accommodations such as houseboats, sailboat cabins, and floating homes.

## Tech Stack

- **Frontend Framework**: React 19.2.0
- **Build Tool**: Vite 6.0.0
- **Language**: TypeScript
- **Styling**: TailwindCSS 3.4.15
- **Routing**: React Router DOM 7.1.1
- **Linting**: ESLint with TypeScript support

## Getting Started

### Prerequisites

- Node.js 24 LTS recommended (verified with 24.13.0); the existing dependency set requires at least Node.js 22.13.0 on the Node.js 22 line
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Project Structure

```
water-bnb/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Header.tsx       # Navigation header with logo and menu
│   │   ├── Footer.tsx       # Site footer
│   │   ├── Hero.tsx         # Hero section component
│   │   ├── Carousel.tsx     # Image carousel component
│   │   ├── ListingCard.tsx  # Individual listing card
│   │   ├── StarRating.tsx   # Star rating display component
│   │   └── Login.tsx        # Login modal/form
│   ├── pages/               # Page components
│   │   ├── HomePage.tsx     # Main landing page with listing grid
│   │   └── ListingDetailPage.tsx  # Individual listing detail page
│   ├── data/
│   │   └── listings.ts      # Mock listing data
│   ├── types.ts             # TypeScript type definitions
│   ├── App.tsx              # Root app component with routing
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles and Tailwind imports
├── public/                  # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── eslint.config.js
```

## Features

- **Demo mode**: Open **Demo mode** in your profile for an automatic walkthrough, or **Try the demo** in the footer. `/demo` is also accessible while signed out. Follow fictional host Maya and guest Alex through sign-in, host setup, listing creation, booking approval, checkout, and a simulated host payout. Pause, change speed, step through manually, or replay. The demo uses local fixtures, replaces the live app shell, and never writes account, listing, booking, or payment data. Exiting discards the simulation.

- **Listing Display**: Responsive grid layout (1-4 columns based on screen size) with real images from Unsplash
- **Clickable Listings**: Each listing card navigates to a unique URL (`/listing/:id`)
- **Listing Detail Pages**: Full-width hero image, booking form with date pickers and guest selection
- **Header Navigation**: Sticky header with mobile-responsive hamburger menu

## Routes

| Route | Description |
|-------|-------------|
| `/` | Home page with listing grid |
| `/listing/:id` | Individual listing detail page |

## License

MIT
