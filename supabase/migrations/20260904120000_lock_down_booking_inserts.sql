-- Bookings must only be created server-side.
--
-- Both of these policies were `with check (true)` for the `public` role, so
-- anyone holding the publishable key (it ships in the browser bundle) could
-- insert a booking directly: status 'confirmed', total 0, arbitrary dates.
-- That is a free reservation, and because fetchBookedDateRanges() treats
-- status = 'confirmed' as booked, it also blocks the host's real calendar.
--
-- Nothing in the app needs these. The only client-side insert lived in
-- bookingsApi.createBooking(), which is dead code and is removed in this
-- change; the live booking paths run in the `payments` edge function under
-- the service role, which bypasses RLS.
--
-- To revert: recreate with
--   create policy "Public booking creation" on bookings for insert with check (true);
drop policy if exists "Anyone can create bookings" on bookings;
drop policy if exists "Public booking creation" on bookings;
