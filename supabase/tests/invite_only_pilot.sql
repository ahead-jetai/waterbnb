\set ON_ERROR_STOP on
\ir ../migrations/20261124140000_invite_only_pilot.sql

begin;

set local role anon;
do $$
begin
  if exists (select id from listings) then raise exception 'Drafts leaked into public browse'; end if;
  if exists (select * from marketplace_unavailable_dates('own-boat')) then
    raise exception 'Public calendar exposed a draft listing';
  end if;
  if has_function_privilege('anon', 'public.pilot_can_book(text,text)', 'EXECUTE') then
    raise exception 'The invitation lookup is publicly callable';
  end if;
end;
$$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"user_guest"}';
do $$
begin
  if (select count(id) from listings) <> 1 or not exists (select id from listings where id = 'own-boat') then
    raise exception 'Trip participants must retain access only to their own unpublished trip listing';
  end if;
end;
$$;
set local request.jwt.claims = '{"sub":"user_host"}';
do $$
begin
  if not exists (select id from listings where id = 'own-boat') then
    raise exception 'Host cannot view their own listing draft';
  end if;
  begin
    update listings set pilot_approved_at = now() where id = 'own-boat';
    raise exception 'Host approved their own listing';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

insert into public.pilot_invitations (clerk_user_id, role)
values ('user_host', 'host'), ('user_guest', 'guest'), ('user_host', 'guest');
insert into public.listing_check_in_schedules values ('own-boat', '15:00', 'America/Los_Angeles');
update listings set pilot_approved_at = now() where id = 'own-boat';

do $$
begin
  if pilot_can_book('user_guest', 'own-boat') then raise exception 'Pilot opened by default'; end if;
end;
$$;
update pilot_settings set bookings_enabled = true;

set local role service_role;
do $$
begin
  if not pilot_can_book('user_guest', 'own-boat')
    or pilot_can_book('user_uninvited', 'own-boat')
    or pilot_can_book('user_guest', 'other-boat')
    or pilot_can_book('user_host', 'own-boat') then
    raise exception 'Booking access must require a guest invite and approved listing, and block self-booking';
  end if;

  begin
    insert into bookings (listing_id, guest_id, check_in, check_out, guests, guest_name, guest_email, guest_phone,
      subtotal, service_fee, total, booking_reference)
    values ('own-boat', 'user_uninvited', '2099-09-01', '2099-09-02', 1, '', '', '', 100, 12, 112, 'UNINVITED');
    raise exception 'A booking bypassed pilot validation';
  exception when sqlstate 'P4403' then null;
  end;

  perform * from reserve_booking_checkout('user_guest', 'own-boat', null,
    '{"check_in":"2099-09-01","check_out":"2099-09-02","name":"Guest","email":"guest@example.test","phone":"","guests":1}',
    '{"subtotal":10000,"service_fee":1200,"total":11200}');
end;
$$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"user_host"}';
update listings set price_per_night = 111 where id = 'own-boat';
do $$
begin
  if not exists (select id from listings where id = 'own-boat' and pilot_approved_at is not null) then
    raise exception 'Price-only updates should not withdraw vetting';
  end if;
end;
$$;
update listings set location = 'Different berth' where id = 'own-boat';
do $$
begin
  if not exists (select id from listings where id = 'own-boat' and pilot_approved_at is null) then
    raise exception 'Changing a berth should withdraw vetting';
  end if;
end;
$$;
reset role;

update listings set pilot_approved_at = now() where id = 'own-boat';
delete from pilot_invitations where clerk_user_id = 'user_host' and role = 'host';
do $$
begin
  if exists (select id from listings where id = 'own-boat' and pilot_approved_at is not null) then
    raise exception 'Revoked host remains published';
  end if;
  begin
    update bookings set checkout_session_id = 'cs_test' where status = 'checkout_pending';
    raise exception 'An in-flight Checkout was attached after publication was revoked';
  exception when sqlstate 'P4403' then null;
  end;
end;
$$;
update bookings set status = 'cancelled' where booking_reference = 'TEST-1';
rollback;
