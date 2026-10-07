-- Hosts can choose instant booking or manual review per listing.
-- Existing listings keep current behavior by defaulting to instant booking.
alter table listings
  add column if not exists auto_approve_bookings boolean not null default true;

-- Booking requests awaiting host review should not be treated as confirmed
-- reservations until the host accepts them. Declined requests are retained so
-- guests can see the outcome in their trip history.
alter table bookings
  drop constraint if exists bookings_status_check;

alter table bookings
  add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'declined', 'cancelled'));

create index if not exists bookings_pending_host_review_idx
  on bookings (listing_id, status, check_in, check_out)
  where status = 'pending';
