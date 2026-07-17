-- Host<->guest chat + notifications, created when a booking is finalized.
-- One conversation per booking (unique booking_id); messages and
-- notifications hang off it. Applied to the hosted project on 2026-07-15.
-- NOTE: the permissive public policies created here were REMOVED by
-- 20260716120000_secure_chat_and_previews.sql — these tables carry PII and
-- are only accessed through the Clerk-verified messages edge function.
create table conversations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings(id) on delete cascade,
  listing_id text not null references listings(id),
  host_id text not null,
  guest_id text not null,
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id text not null, -- Clerk user id, or 'system' for auto-generated messages
  body text not null,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on messages (conversation_id, created_at);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  body text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);

alter table conversations enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;

create policy "Public read conversations" on conversations for select using (true);
create policy "Anyone can create conversations" on conversations for insert with check (true);
create policy "Public read messages" on messages for select using (true);
create policy "Anyone can create messages" on messages for insert with check (true);
create policy "Public read notifications" on notifications for select using (true);
create policy "Anyone can create notifications" on notifications for insert with check (true);
create policy "Anyone can update notifications" on notifications for update using (true);

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;
