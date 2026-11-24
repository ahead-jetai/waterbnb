\set ON_ERROR_STOP on

-- Supabase normally supplies the API roles and managed schemas. Only the catalog
-- objects used by the actual migrations are stubbed for disposable Postgres.
create schema auth;
create schema storage;
create schema extensions;
create publication supabase_realtime;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:cardinality(string_to_array(name, '/')) - 1]
$$;
create table storage.buckets (
  id text primary key, name text not null, public boolean, file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (bucket_id text references storage.buckets, name text, primary key(bucket_id, name));
alter table storage.objects enable row level security;
grant usage on schema auth, storage to anon, authenticated;
grant select, insert, update, delete on storage.objects to anon, authenticated;

\ir ../migrations/20260701000000_base_marketplace.sql
\ir ../migrations/20260715120000_chat_and_notifications.sql
\ir ../migrations/20260716120000_secure_chat_and_previews.sql
\ir ../migrations/20260717120000_conversation_read_tracking.sql
\ir ../migrations/20260723120000_booking_request_approval.sql
\ir ../migrations/20260723130000_host_review_pay_after_approval.sql
\ir ../migrations/20260904120000_lock_down_booking_inserts.sql
\ir ../migrations/20261123120000_checkout_holds_and_refunds.sql
\ir ../migrations/20261124120000_marketplace_access_controls.sql

insert into public.listings (id, title, location, price_per_night, host_id)
values ('own-boat', 'Owner boat', 'Test marina', 100, 'user_host'),
       ('other-boat', 'Other boat', 'Test marina', 125, 'user_other');
insert into public.host_profiles (id, name, stripe_account_id) values ('user_host', 'Host', 'acct_test');
insert into public.bookings
  (listing_id, guest_id, check_in, check_out, guests, guest_name, guest_email, guest_phone, status, subtotal, service_fee, total, booking_reference)
values ('own-boat', 'user_guest', '2099-08-10', '2099-08-12', 1, 'Guest', 'guest@example.test', '5550100', 'confirmed', 200, 24, 224, 'TEST-1'),
       ('other-boat', 'user_other_guest', '2099-08-10', '2099-08-12', 1, '', '', '', 'confirmed', 250, 30, 280, 'TEST-2');
insert into storage.objects values ('listing-images', 'user_other/saved.png');

set role anon;
do $$
begin
  if (select count(id) from listings) <> 2 then raise exception 'Anonymous listing browse failed'; end if;
  if (select count(*) from marketplace_unavailable_dates('own-boat')) <> 1 then
    raise exception 'Anonymous calendar cannot show confirmed dates';
  end if;
  if has_column_privilege(current_user, 'bookings', 'guest_email', 'select') then
    raise exception 'Anonymous browsers can read a guest email';
  end if;
  if has_column_privilege(current_user, 'host_profiles', 'stripe_account_id', 'select') then
    raise exception 'Anonymous browsers can read Stripe accounts';
  end if;
  begin
    insert into listings (title, location, price_per_night, host_id) values ('unauthed', 'test', 100, 'user_host');
    raise exception 'Anonymous user created a listing';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

begin;
insert into public.listing_check_in_schedules (listing_id, check_in_time, time_zone)
values ('own-boat', '15:00', 'America/New_York');
set local role service_role;
select id from reserve_booking_checkout('user_guest', 'own-boat', null,
  '{"check_in":"2099-09-01","check_out":"2099-09-02","name":"Guest","email":"guest@example.test","phone":"","guests":1}',
  '{"subtotal":10000,"service_fee":1200,"total":11200}');
rollback;

set role authenticated;
set request.jwt.claims = '{"sub":"user_host"}';
do $$
begin
  if (select count(guest_email) from bookings) <> 1 then raise exception 'Host bookings leaked or were not visible'; end if;
  update listings set title = 'Updated boat' where id = 'own-boat';
  if not found then raise exception 'Host could not edit their listing'; end if;
  update listings set title = 'Not allowed' where id = 'other-boat';
  if found then raise exception 'Host edited another listing'; end if;
  insert into listings (title, location, price_per_night, host_id) values ('New boat', 'Test marina', 150, 'user_host');
  begin
    insert into listings (title, location, price_per_night, host_id) values ('Wrong owner', 'Test marina', 150, 'user_other');
    raise exception 'Host chose a different owner';
  exception when insufficient_privilege then null;
  end;
  begin
    update listings set auto_approve_bookings = false where id = 'own-boat';
    raise exception 'Browser bypassed the booking-mode action';
  exception when insufficient_privilege then null;
  end;
  insert into host_profiles (id, bio) values ('user_host', 'Updated bio')
    on conflict (id) do update set bio = excluded.bio;
  if not exists (select id from host_profiles where id = 'user_host' and bio = 'Updated bio') then
    raise exception 'Host could not upsert their profile';
  end if;
  begin
    update host_profiles set stripe_account_id = 'acct_wrong' where id = 'user_host';
    raise exception 'Browser wrote the Stripe account';
  exception when insufficient_privilege then null;
  end;
  insert into listing_blocked_dates (listing_id, start_date, end_date, reason)
  values ('own-boat', '2099-08-14', '2099-08-16', 'Private note');
  begin
    insert into listing_blocked_dates (listing_id, start_date, end_date)
    values ('other-boat', '2099-08-14', '2099-08-16');
    raise exception 'Host changed a calendar they do not own';
  exception when insufficient_privilege then null;
  end;
  insert into storage.objects values ('listing-images', 'user_host/draft.png');
  delete from storage.objects where name = 'user_host/draft.png';
  if not found then raise exception 'Host could not remove their own photo'; end if;
  delete from storage.objects where name = 'user_other/saved.png';
  if found then raise exception 'Host removed another host''s photo'; end if;
  begin
    insert into storage.objects values ('listing-images', 'user_other/wrong.png');
    raise exception 'Host wrote outside their photo namespace';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set request.jwt.claims = '{"sub":"user_guest"}';
do $$
begin
  if (select count(guest_email) from bookings) <> 1 then raise exception 'Guest bookings leaked or were not visible'; end if;
  if (select count(reason) from listing_blocked_dates) <> 0 then raise exception 'Calendar notes leaked'; end if;
  if (select count(*) from marketplace_unavailable_dates(null, '2099-08-14', '2099-08-17')) <> 1 then
    raise exception 'Availability search failed after private blocks were isolated';
  end if;
  begin
    update bookings set status = 'cancelled' where booking_reference = 'TEST-1';
    raise exception 'Guest bypassed the server refund workflow';
  exception when insufficient_privilege then null;
  end;
  if has_column_privilege(current_user, 'bookings', 'stripe_payment_intent_id', 'select') then
    raise exception 'The payment intent is readable by a browser';
  end if;
end;
$$;
reset role;
