create extension if not exists btree_gist with schema extensions;

alter table public.bookings
  drop constraint bookings_status_check,
  add constraint bookings_status_check
    check (status in ('pending', 'approved_payment_pending', 'checkout_pending', 'confirmed', 'declined', 'cancelled', 'expired')),
  add column checkout_expires_at timestamptz,
  add column checkout_session_id text unique,
  add column checkout_params jsonb,
  add column stripe_payment_intent_id text unique,
  add column refund_cutoff_at timestamptz,
  add column refund_requested_at timestamptz,
  add column stripe_refund_id text unique,
  add column refund_status text check (refund_status in ('requested', 'pending', 'succeeded', 'failed'));

set search_path = public, extensions;
alter table public.bookings
  add constraint bookings_no_reserved_overlap exclude using gist (
    listing_id with =, daterange(check_in, check_out, '[)') with &&
  ) where (status in ('checkout_pending', 'confirmed'));
reset search_path;
create index bookings_checkout_expiry_idx
  on public.bookings (listing_id, checkout_expires_at) where status = 'checkout_pending';

drop policy if exists "Anyone can update bookings" on public.bookings;
revoke insert, update, delete on public.bookings from public, anon, authenticated;

create table public.listing_check_in_schedules (
  listing_id text primary key references public.listings(id) on delete cascade,
  check_in_time time not null check (check_in_time < time '24:00'),
  time_zone text not null
);
alter table public.listing_check_in_schedules enable row level security;
revoke all on public.listing_check_in_schedules from public, anon, authenticated;
grant select, insert, update, delete on public.listing_check_in_schedules to service_role;

create function public.reserve_booking_checkout(
  p_guest text, p_listing text, p_booking uuid, p_input jsonb, p_checkout jsonb
) returns setof public.bookings
language plpgsql set search_path = '' as $$
declare
  held public.bookings;
  listing public.listings;
  arrival date;
  departure date;
  cutoff timestamptz;
  zone text;
  now_at timestamptz := clock_timestamp();
begin
  select * into listing from public.listings where id = p_listing for update;
  if not found or listing.host_id is null then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;

  -- An unattached session URL has never been returned to a guest.
  update public.bookings set status = 'expired'
   where listing_id = p_listing and status = 'checkout_pending' and checkout_session_id is null
     and checkout_expires_at <= now_at + interval '30 minutes';

  if p_booking is not null then
    select * into held from public.bookings
      where id = p_booking and guest_id = p_guest and listing_id = p_listing for update;
    if not found or held.status not in ('approved_payment_pending', 'checkout_pending', 'expired') then
      raise exception 'Booking awaiting payment not found' using errcode = 'P0002';
    end if;
    if held.status <> 'approved_payment_pending' then return next held; return; end if;
    arrival := held.check_in;
    departure := held.check_out;
  else
    arrival := (p_input->>'check_in')::date;
    departure := (p_input->>'check_out')::date;
    select * into held from public.bookings
      where listing_id = p_listing and guest_id = p_guest and check_in = arrival and check_out = departure
        and status = 'checkout_pending' for update;
    if found then return next held; return; end if;
    if not listing.auto_approve_bookings then
      raise exception 'Host approval is required' using errcode = 'P0001';
    end if;
  end if;

  if arrival is null or departure is null or arrival >= departure then
    raise exception 'Invalid booking dates' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.listing_blocked_dates
     where listing_id = p_listing and start_date < departure and end_date > arrival
  ) then
    raise exception 'Dates are blocked' using errcode = '23P01';
  end if;

  select ((arrival + s.check_in_time) at time zone s.time_zone) - interval '48 hours', s.time_zone into cutoff, zone
    from public.listing_check_in_schedules s
    join pg_catalog.pg_timezone_names z on z.name = s.time_zone
    where s.listing_id = p_listing;
  if cutoff is null then
    raise exception 'This listing has no verified check-in schedule' using errcode = 'P0001';
  end if;
  if cutoff + interval '48 hours' <= now_at then
    raise exception 'Check-in time has already passed' using errcode = '22023';
  end if;
  p_checkout := p_checkout || jsonb_build_object('check_in_zone', zone);

  if p_booking is null then
    insert into public.bookings (
      listing_id, guest_id, check_in, check_out, guests, guest_name, guest_email, guest_phone, special_requests,
      subtotal, service_fee, total, booking_reference, status, checkout_expires_at, checkout_params, refund_cutoff_at
    ) values (
      p_listing, p_guest, arrival, departure, (p_input->>'guests')::integer,
      p_input->>'name', p_input->>'email', p_input->>'phone', p_input->>'special_requests',
      (p_checkout->>'subtotal')::numeric / 100, (p_checkout->>'service_fee')::numeric / 100,
      (p_checkout->>'total')::numeric / 100, 'WB' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
      'checkout_pending', date_trunc('second', now_at) + interval '45 minutes', p_checkout, cutoff
    ) returning * into held;
  else
    update public.bookings set
      subtotal = (p_checkout->>'subtotal')::numeric / 100,
      service_fee = (p_checkout->>'service_fee')::numeric / 100,
      total = (p_checkout->>'total')::numeric / 100,
      status = 'checkout_pending', checkout_expires_at = date_trunc('second', now_at) + interval '45 minutes',
      checkout_params = p_checkout, refund_cutoff_at = cutoff
    where id = held.id returning * into held;
  end if;
  return next held;
end;
$$;

create function public.prevent_blocking_reserved_dates() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.listings where id = new.listing_id for update;
  update public.bookings set status = 'expired'
   where listing_id = new.listing_id and status = 'checkout_pending' and checkout_session_id is null
     and checkout_expires_at <= clock_timestamp() + interval '30 minutes';
  if exists (
    select 1 from public.bookings
     where listing_id = new.listing_id and status in ('checkout_pending', 'confirmed')
       and check_in < new.end_date and check_out > new.start_date
  ) then
    raise exception 'Those dates already have a reservation or active checkout' using errcode = '23P01';
  end if;
  return new;
end;
$$;

create trigger listing_blocks_respect_reservations
  before insert or update on public.listing_blocked_dates
  for each row execute function public.prevent_blocking_reserved_dates();

create function public.claim_booking_refund(p_booking uuid, p_guest text)
returns setof public.bookings
language plpgsql set search_path = '' as $$
declare
  booked public.bookings;
begin
  select * into booked from public.bookings where id = p_booking and guest_id = p_guest for update;
  if not found then raise exception 'Booking not found' using errcode = 'P0002'; end if;
  if booked.refund_requested_at is not null then return next booked; return; end if;
  if booked.status <> 'confirmed' or booked.stripe_payment_intent_id is null
      or booked.refund_cutoff_at is null or clock_timestamp() > booked.refund_cutoff_at then
    raise exception 'This booking is not eligible for automatic cancellation. Contact support.' using errcode = 'P0001';
  end if;
  update public.bookings set refund_requested_at = clock_timestamp(), refund_status = 'requested'
    where id = booked.id returning * into booked;
  return next booked;
end;
$$;

create function public.notify_booking_refunded() returns trigger
language plpgsql set search_path = '' as $$
begin
  insert into public.notifications (user_id, title, body, link)
  select l.host_id, 'Guest cancelled a booking',
    'The guest received a full refund for booking ' || new.booking_reference || '. The dates are available again.',
    '/hosting'
  from public.listings l where l.id = new.listing_id and l.host_id is not null;

  insert into public.notifications (user_id, title, body, link)
  values (new.guest_id, 'Full refund issued',
    'Booking ' || new.booking_reference || ' was cancelled and the full payment was refunded.', '/trips');
  return new;
end;
$$;

create trigger booking_refund_notification after update of refund_status on public.bookings
  for each row when (new.refund_status = 'succeeded' and old.refund_status is distinct from new.refund_status)
  execute function public.notify_booking_refunded();

revoke execute on function public.reserve_booking_checkout(text,text,uuid,jsonb,jsonb),
  public.claim_booking_refund(uuid,text), public.prevent_blocking_reserved_dates(), public.notify_booking_refunded()
  from public, anon, authenticated;
grant execute on function public.reserve_booking_checkout(text,text,uuid,jsonb,jsonb),
  public.claim_booking_refund(uuid,text) to service_role;
