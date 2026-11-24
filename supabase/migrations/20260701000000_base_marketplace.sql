-- Before July 2026 these tables and the listing bucket were created in the dashboard.
-- IF NOT EXISTS lets established environments register this baseline without replacing data.
create table if not exists public.listings (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  location text not null,
  price_per_night integer not null,
  rating numeric not null default 0,
  reviews integer not null default 0,
  image text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  boat_type text not null default 'other',
  capacity integer not null default 2,
  amenities text[] not null default '{}',
  images text[] not null default '{}',
  description text not null default '',
  host_id text,
  stripe_product_id text
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null references public.listings(id) on delete cascade,
  check_in date not null,
  check_out date not null check (check_out > check_in),
  guests integer not null check (guests > 0),
  guest_name text not null,
  guest_email text not null,
  guest_phone text not null,
  special_requests text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  guest_id text not null,
  subtotal numeric not null,
  service_fee numeric not null,
  total numeric not null,
  booking_reference text not null unique
);

create table if not exists public.host_profiles (
  id text primary key,
  name text not null default '',
  avatar_url text not null default '',
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  stripe_account_id text
);

create table if not exists public.listing_blocked_dates (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null references public.listings(id) on delete cascade,
  start_date date not null,
  end_date date not null check (end_date > start_date),
  reason text,
  created_at timestamptz not null default now()
);

alter table public.listings enable row level security;
alter table public.bookings enable row level security;
alter table public.host_profiles enable row level security;
alter table public.listing_blocked_dates enable row level security;

create index if not exists listings_host_id_idx on public.listings (host_id);
create index if not exists bookings_guest_id_idx on public.bookings (guest_id);
create index if not exists bookings_listing_id_idx on public.bookings (listing_id);
create index if not exists listing_blocked_dates_listing_id_idx on public.listing_blocked_dates (listing_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
