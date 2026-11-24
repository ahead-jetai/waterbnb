alter table public.listings
  add column pilot_approved_at timestamptz,
  add constraint pilot_listing_requires_host check (pilot_approved_at is null or host_id is not null);
grant select (pilot_approved_at) on public.listings to anon, authenticated;

create table public.pilot_settings (
  singleton boolean primary key default true check (singleton),
  bookings_enabled boolean not null default false
);
insert into public.pilot_settings default values;

create table public.pilot_invitations (
  clerk_user_id text not null,
  role text not null check (role in ('guest', 'host')),
  invited_at timestamptz not null default now(),
  primary key (clerk_user_id, role)
);

alter table public.pilot_settings enable row level security;
alter table public.pilot_invitations enable row level security;
revoke all on public.pilot_settings, public.pilot_invitations from public, anon, authenticated;
grant select, update on public.pilot_settings to service_role;
grant select, insert, delete on public.pilot_invitations to service_role;

create function public.pilot_can_book(p_guest text, p_listing text)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.listings l
    join public.listing_check_in_schedules s on s.listing_id = l.id and s.time_zone = 'America/Los_Angeles'
    join public.pilot_invitations h on h.clerk_user_id = l.host_id and h.role = 'host'
    join public.pilot_invitations g on g.clerk_user_id = p_guest and g.role = 'guest'
    cross join public.pilot_settings cfg
    where l.id = p_listing and l.pilot_approved_at is not null and l.host_id <> p_guest
      and cfg.bookings_enabled
  );
$$;
revoke execute on function public.pilot_can_book(text,text) from public, anon, authenticated;
grant execute on function public.pilot_can_book(text,text) to service_role;

create function public.enforce_pilot_booking() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status in ('pending', 'approved_payment_pending', 'checkout_pending') then
    if tg_op = 'UPDATE' then
      if old.status = new.status and old.checkout_session_id is not distinct from new.checkout_session_id then
        return new;
      end if;
    end if;
    if not public.pilot_can_book(new.guest_id, new.listing_id) then
      raise exception 'Bookings are available only to invited guests on approved pilot listings.'
        using errcode = 'P4403';
    end if;
  end if;
  return new;
end;
$$;
create trigger bookings_require_pilot_access before insert or update of status, checkout_session_id
  on public.bookings for each row execute function public.enforce_pilot_booking();
revoke execute on function public.enforce_pilot_booking() from public, anon, authenticated;

create function public.reset_listing_pilot_approval() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.host_id, new.title, new.location, new.boat_type, new.capacity, new.amenities,
      new.description, new.images, new.image, new.tags)
    is distinct from
     (old.host_id, old.title, old.location, old.boat_type, old.capacity, old.amenities,
      old.description, old.images, old.image, old.tags) then
    new.pilot_approved_at := null;
  end if;
  return new;
end;
$$;
create trigger listings_review_material_changes before update on public.listings
  for each row execute function public.reset_listing_pilot_approval();
revoke execute on function public.reset_listing_pilot_approval() from public, anon, authenticated;

create function public.unpublish_revoked_pilot_host() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.listings set pilot_approved_at = null
  where host_id = old.clerk_user_id and pilot_approved_at is not null;
  return old;
end;
$$;
create trigger pilot_host_revocation_unpublishes after delete on public.pilot_invitations
  for each row when (old.role = 'host') execute function public.unpublish_revoked_pilot_host();
revoke execute on function public.unpublish_revoked_pilot_host() from public, anon, authenticated;

-- Past and in-progress trip participants retain access even if a boat is taken
-- out of the catalog. The definer avoids a circular listings/bookings policy.
create function public.is_guest_on_listing(p_listing text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.bookings
    where listing_id = p_listing and guest_id = (select auth.jwt()->>'sub')
  );
$$;
revoke execute on function public.is_guest_on_listing(text) from public, anon, authenticated;
grant execute on function public.is_guest_on_listing(text) to authenticated;

drop policy listings_public_read on public.listings;
create policy listings_pilot_public_read on public.listings for select to anon, authenticated
  using (pilot_approved_at is not null);
create policy listings_host_read on public.listings for select to authenticated
  using (host_id = (select auth.jwt()->>'sub'));
create policy listings_booked_guest_read on public.listings for select to authenticated
  using (public.is_guest_on_listing(id));

create or replace function public.marketplace_unavailable_dates(
  p_listing text default null, p_start date default null, p_end date default null
) returns table (listing_id text, check_in date, check_out date, source text)
language sql stable security definer set search_path = '' as $$
  select b.listing_id, b.check_in, b.check_out, 'booking'::text
  from public.bookings b join public.listings l on l.id = b.listing_id
  where (l.pilot_approved_at is not null or l.host_id = (select auth.jwt()->>'sub'))
    and b.status = 'confirmed' and (p_listing is not null or (p_start is not null and p_end is not null))
    and (p_listing is null or b.listing_id = p_listing)
    and (p_start is null or b.check_out > p_start) and (p_end is null or b.check_in < p_end)
  union all
  select b.listing_id, b.start_date, b.end_date, 'host'::text
  from public.listing_blocked_dates b join public.listings l on l.id = b.listing_id
  where (l.pilot_approved_at is not null or l.host_id = (select auth.jwt()->>'sub'))
    and (p_listing is not null or (p_start is not null and p_end is not null))
    and (p_listing is null or b.listing_id = p_listing)
    and (p_start is null or b.end_date > p_start) and (p_end is null or b.start_date < p_end);
$$;
