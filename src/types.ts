export type Listing = {
  id: string
  title: string
  location: string // e.g., "Split, Croatia"
  pricePerNight: number
  rating: number // 0..5
  reviews: number
  image: string
  tags: string[]
}
