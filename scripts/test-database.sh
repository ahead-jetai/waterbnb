#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
if command -v pg_config >/dev/null; then
  export PATH="$(pg_config --bindir):$PATH"
fi
for tool in initdb pg_ctl psql createdb pg_dump pg_restore; do
  command -v "$tool" >/dev/null || { echo "PostgreSQL is required: $tool not found" >&2; exit 1; }
done
unset PGHOST PGHOSTADDR PGPORT PGDATABASE PGUSER PGPASSWORD PGSERVICE PGSERVICEFILE PGOPTIONS
tmp="$(mktemp -d /tmp/waterbnb-db.XXXXXX)"
cleanup() {
  pg_ctl -D "$tmp/data" -m fast -w stop >/dev/null 2>&1 || true
  if [[ -d "$tmp/data" ]]; then find "$tmp/data" -depth -delete; fi
  rm -f -- "$tmp/postgres.log" "$tmp/backup.dump"
  rmdir "$tmp"
}
trap cleanup EXIT
export PGHOST="$tmp" PGPORT=5432

initdb -A trust --no-locale -D "$tmp/data" >/dev/null
if ! pg_ctl -D "$tmp/data" -l "$tmp/postgres.log" -o "-h '' -k $tmp -c unix_socket_permissions=0700 -c wal_level=logical" -w start >/dev/null; then
  cat "$tmp/postgres.log" >&2
  exit 1
fi
createdb waterbnb_holds
psql -X -q -d waterbnb_holds -f supabase/tests/checkout_holds_and_refunds.sql
psql -X -q -d postgres -c 'alter role service_role bypassrls'
createdb waterbnb_marketplace
psql -X -q -d waterbnb_marketplace -f supabase/tests/marketplace_access_controls.sql

pg_dump -Fc -d waterbnb_marketplace -f "$tmp/backup.dump"
createdb waterbnb_restore
pg_restore --exit-on-error -d waterbnb_restore "$tmp/backup.dump"
test "$(psql -XAt -d waterbnb_restore -c 'select count(*) from public.bookings')" = 2
test "$(psql -XAt -d waterbnb_restore -c "select id from storage.buckets where id = 'listing-images' and public")" = listing-images
test "$(psql -XAt -d waterbnb_restore -c "select has_column_privilege('anon', 'public.bookings', 'guest_email', 'SELECT')")" = f
echo 'Migration, access control, booking concurrency, and database restore checks passed.'
