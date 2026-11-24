drop policy if exists "Anyone can create listings" on public.listings;
drop policy if exists "Anyone can update listings" on public.listings;
drop policy if exists "Public read access" on public.listings;
drop policy if exists "Public read listings" on public.listings;
drop policy if exists "Public read bookings" on public.bookings;
drop policy if exists "Anyone can create blocked dates" on public.listing_blocked_dates;
drop policy if exists "Anyone can delete blocked dates" on public.listing_blocked_dates;
drop policy if exists "Public read blocked dates" on public.listing_blocked_dates;
drop policy if exists "Anyone can update host profiles" on public.host_profiles;
drop policy if exists "Anyone can upsert host profiles" on public.host_profiles;
drop policy if exists "Public read host profiles" on public.host_profiles;
drop policy if exists "Public read listing images" on storage.objects;
drop policy if exists "Anyone can delete listing images" on storage.objects;
drop policy if exists "Anyone can upload listing images" on storage.objects;

revoke create on schema public from public, anon, authenticated;
revoke all on public.listings, public.bookings, public.listing_blocked_dates, public.host_profiles,
  public.conversations, public.conversation_reads, public.messages, public.notifications
  from public, anon, authenticated;
grant select, insert, update, delete on public.listings, public.bookings, public.listing_blocked_dates,
  public.host_profiles, public.conversations, public.conversation_reads, public.messages, public.notifications
  to service_role;

grant select (id, title, location, price_per_night, rating, reviews, image, tags, created_at,
  boat_type, capacity, amenities, images, description, host_id, auto_approve_bookings)
  on public.listings to anon, authenticated;
grant insert (title, location, price_per_night, image, tags, boat_type, capacity, amenities, images,
  description, host_id, auto_approve_bookings),
  update (title, location, price_per_night, image, tags, boat_type, capacity, amenities, images, description)
  on public.listings to authenticated;

grant select (id, listing_id, guest_id, check_in, check_out, guests, status, guest_name, guest_email,
  guest_phone, special_requests, subtotal, service_fee, total, booking_reference, created_at,
  refund_cutoff_at, refund_status) on public.bookings to authenticated;

grant select (id, listing_id, start_date, end_date, reason), insert (listing_id, start_date, end_date, reason),
  delete on public.listing_blocked_dates to authenticated;

grant select (id, name, avatar_url, bio) on public.host_profiles to anon, authenticated;
grant insert (id, name, avatar_url, bio), update (id, name, avatar_url, bio)
  on public.host_profiles to authenticated;

-- Clerk user IDs are strings, not the UUIDs returned by auth.uid().
create policy listings_public_read on public.listings for select to anon, authenticated using (true);
create policy listings_host_insert on public.listings for insert to authenticated
  with check (host_id = (select auth.jwt()->>'sub'));
create policy listings_host_update on public.listings for update to authenticated
  using (host_id = (select auth.jwt()->>'sub')) with check (host_id = (select auth.jwt()->>'sub'));

create policy bookings_participants_read on public.bookings for select to authenticated
  using (guest_id = (select auth.jwt()->>'sub') or (
    status not in ('checkout_pending', 'expired') and exists (
      select 1 from public.listings l where l.id = listing_id and l.host_id = (select auth.jwt()->>'sub')
    )
  ));

create policy blocks_host_read on public.listing_blocked_dates for select to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.host_id = (select auth.jwt()->>'sub')));
create policy blocks_host_insert on public.listing_blocked_dates for insert to authenticated
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.host_id = (select auth.jwt()->>'sub')));
create policy blocks_host_delete on public.listing_blocked_dates for delete to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.host_id = (select auth.jwt()->>'sub')));

create policy profiles_public_read on public.host_profiles for select to anon, authenticated using (true);
create policy profiles_owner_insert on public.host_profiles for insert to authenticated
  with check (id = (select auth.jwt()->>'sub'));
create policy profiles_owner_update on public.host_profiles for update to authenticated
  using (id = (select auth.jwt()->>'sub')) with check (id = (select auth.jwt()->>'sub'));

create function public.touch_host_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger touch_host_profile before update on public.host_profiles
  for each row execute function public.touch_host_profile();
revoke execute on function public.touch_host_profile() from public, anon, authenticated;

-- Public object URLs remain usable; only writers may list/delete their own objects.
create policy listing_images_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.jwt()->>'sub'));
create policy listing_images_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.jwt()->>'sub'));
create policy listing_images_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.jwt()->>'sub'));

-- The calendar exposes no booking IDs, customer data, prices, or private block notes.
create function public.marketplace_unavailable_dates(
  p_listing text default null, p_start date default null, p_end date default null
) returns table (listing_id text, check_in date, check_out date, source text)
language sql stable security definer set search_path = '' as $$
  select b.listing_id, b.check_in, b.check_out, 'booking'::text
  from public.bookings b
  where b.status = 'confirmed' and (p_listing is not null or (p_start is not null and p_end is not null))
    and (p_listing is null or b.listing_id = p_listing)
    and (p_start is null or b.check_out > p_start) and (p_end is null or b.check_in < p_end)
  union all
  select b.listing_id, b.start_date, b.end_date, 'host'::text
  from public.listing_blocked_dates b
  where (p_listing is not null or (p_start is not null and p_end is not null))
    and (p_listing is null or b.listing_id = p_listing)
    and (p_start is null or b.end_date > p_start) and (p_end is null or b.start_date < p_end);
$$;

revoke execute on function public.marketplace_unavailable_dates(text,date,date) from public;
grant execute on function public.marketplace_unavailable_dates(text,date,date) to anon, authenticated, service_role;

create or replace function public.set_conversation_last_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations
     set last_message_preview = left(split_part(new.body, E'\n', 1), 140), last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;
revoke execute on function public.set_conversation_last_message() from public, anon, authenticated;
