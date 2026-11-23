\set ON_ERROR_STOP on
-- Run only in an empty, disposable PostgreSQL database.
create role anon;
create role authenticated;
create role service_role;
create schema extensions;
create extension dblink;

create table public.listings (
  id text primary key, host_id text, auto_approve_bookings boolean not null default true
);
create table public.listing_blocked_dates (
  listing_id text not null references public.listings, start_date date not null, end_date date not null
);
create table public.notifications (user_id text not null, title text not null, body text not null, link text);
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null references public.listings,
  guest_id text not null, check_in date not null, check_out date not null, guests int not null,
  guest_name text not null, guest_email text not null, guest_phone text not null, special_requests text,
  status text not null check (status in ('pending', 'approved_payment_pending', 'confirmed', 'declined', 'cancelled', 'expired')),
  subtotal numeric not null, service_fee numeric not null, total numeric not null, booking_reference text not null
);
alter table public.bookings enable row level security;
create policy "Anyone can update bookings" on public.bookings for update using (true);
grant update on public.bookings to anon, authenticated;

\ir ../migrations/20261123120000_checkout_holds_and_refunds.sql

insert into listings values ('boat', 'host', true), ('approval', 'host', false);
insert into listing_check_in_schedules values
  ('boat', '15:00', 'America/New_York'), ('approval', '15:00', 'America/New_York');

create function attempt_hold(actor text, arrival date, departure date, listing text default 'boat', booking uuid default null)
returns text language plpgsql as $$
begin
  return (select id::text from reserve_booking_checkout(actor, listing, booking, jsonb_build_object(
    'check_in', arrival, 'check_out', departure, 'name', 'Guest', 'email', 'guest@example.test', 'phone', '', 'guests', 1
  ), '{"subtotal":10000,"service_fee":1200,"total":11200}'));
exception when exclusion_violation then return 'overlap';
end;
$$;

select dblink_connect('guest_one', format('dbname=%L host=%L port=%L', current_database(), current_setting('unix_socket_directories'), current_setting('port')));
select dblink_connect('guest_two', format('dbname=%L host=%L port=%L', current_database(), current_setting('unix_socket_directories'), current_setting('port')));
create temp table concurrent_guest as
select pid from dblink('guest_two', 'select pg_backend_pid()') as connection(pid int);
select dblink_exec('guest_one', 'begin');
select * from dblink('guest_one', $$select attempt_hold('one', current_date + 10, current_date + 13)$$) as hold(id text);
select dblink_send_query('guest_two', $$select attempt_hold('two', current_date + 11, current_date + 14)$$);
do $$
declare deadline timestamptz := clock_timestamp() + interval '5 seconds';
begin
  while cardinality(pg_blocking_pids((select pid from concurrent_guest))) = 0 loop
    if clock_timestamp() > deadline then raise exception 'Second checkout never waited on the first'; end if;
    perform pg_sleep(0.01);
  end loop;
end;
$$;
select dblink_exec('guest_one', 'commit');

do $$
declare
  one uuid;
  two uuid;
  approval uuid;
  spring_stay uuid;
  original_cutoff timestamptz;
begin
  if (select result from dblink_get_result('guest_two') as result(result text)) is distinct from 'overlap' then
    raise exception 'Concurrent overlapping hold was not rejected';
  end if;
  select id, refund_cutoff_at into strict one, original_cutoff from bookings where guest_id = 'one';
  if original_cutoff <> ((current_date + 10 + time '15:00') at time zone 'America/New_York') - interval '48 hours' then
    raise exception 'Incorrect 48-hour local check-in cutoff';
  end if;
  if attempt_hold('one', current_date + 10, current_date + 13) <> one::text then
    raise exception 'A retry did not reuse its hold';
  end if;
  spring_stay := attempt_hold('spring', date '2099-03-08', date '2099-03-09')::uuid;
  if (select refund_cutoff_at from bookings where id = spring_stay)
      is distinct from timestamptz '2099-03-06 19:00:00+00' then
    raise exception 'The spring DST change shifted the 48-hour cutoff';
  end if;
  begin
    insert into listing_blocked_dates values ('boat', current_date + 12, current_date + 14);
    raise exception 'Host block was allowed to overlap a hold';
  exception when exclusion_violation then null;
  end;
  insert into listing_blocked_dates values ('boat', current_date + 14, current_date + 15);
  if attempt_hold('two', current_date + 14, current_date + 15) <> 'overlap' then
    raise exception 'Hold was allowed to overlap a host block';
  end if;
  -- Back-to-back stays share the checkout boundary without overlapping.
  two := attempt_hold('two', current_date + 13, current_date + 14)::uuid;
  update bookings set checkout_expires_at = now() - interval '1 minute' where id in (one, two);
  update bookings set checkout_session_id = 'cs_attached' where id = two;
  if attempt_hold('three', current_date + 13, current_date + 14) <> 'overlap' then
    raise exception 'An attached session was released without Stripe confirmation';
  end if;
  perform attempt_hold('three', current_date + 10, current_date + 13);
  if (select status from bookings where id = one) <> 'expired' then
    raise exception 'Expired unattached hold was not released';
  end if;

  insert into bookings (listing_id, guest_id, check_in, check_out, guests, guest_name, guest_email, guest_phone,
    subtotal, service_fee, total, booking_reference, status)
  values ('approval', 'guest', current_date + 10, current_date + 12, 1, '', '', '', 100, 12, 112, 'RQ1', 'approved_payment_pending')
  returning id into approval;
  if attempt_hold('guest', null, null, 'approval', approval) <> approval::text then
    raise exception 'Approved bookings did not use the same reservation boundary';
  end if;
  update bookings set status = 'confirmed', stripe_payment_intent_id = 'pi_test' where id = approval;
  begin
    perform * from claim_booking_refund(approval, 'somebody_else');
    raise exception 'A different guest could claim the refund';
  exception when no_data_found then null;
  end;
  update bookings set refund_cutoff_at = now() - interval '1 second' where id = approval;
  begin
    perform * from claim_booking_refund(approval, 'guest');
    raise exception 'Manual-only cutoff did not block automatic refund' using errcode = 'XX000';
  exception when raise_exception then null;
  end;
  update bookings set refund_cutoff_at = now() + interval '1 hour' where id = approval;
  perform * from claim_booking_refund(approval, 'guest');
  if (select status from bookings where id = approval) <> 'confirmed'
    or (select refund_status from bookings where id = approval) <> 'requested' then
    raise exception 'Claiming a refund released a paid reservation';
  end if;
  update bookings set refund_cutoff_at = now() - interval '1 second' where id = approval;
  if (select refund_requested_at from claim_booking_refund(approval, 'guest'))
      <> (select refund_requested_at from bookings where id = approval) then
    raise exception 'A retry did not reuse the original refund claim';
  end if;
  update bookings set status = 'cancelled', refund_status = 'succeeded' where id = approval;
  update bookings set refund_status = 'succeeded' where id = approval;
  if (select count(*) from notifications) <> 2 then
    raise exception 'Refund notifications were not sent once to both participants';
  end if;
  if has_table_privilege('anon', 'public.bookings', 'UPDATE')
    or has_function_privilege('authenticated', 'public.claim_booking_refund(uuid,text)', 'EXECUTE') then
    raise exception 'Browser callers can bypass the booking write boundary';
  end if;
end;
$$;

select dblink_disconnect('guest_one');
select dblink_disconnect('guest_two');
