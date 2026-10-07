-- Host-review bookings should not collect payment until the host approves.
-- approved_payment_pending means the host accepted the request and the guest
-- must complete Stripe Checkout before the booking is confirmed.
alter table bookings
  drop constraint if exists bookings_status_check;

alter table bookings
  add constraint bookings_status_check
  check (status in ('pending', 'approved_payment_pending', 'confirmed', 'declined', 'cancelled', 'expired'));

create index if not exists bookings_approved_payment_pending_idx
  on bookings (guest_id, status, created_at desc)
  where status = 'approved_payment_pending';
