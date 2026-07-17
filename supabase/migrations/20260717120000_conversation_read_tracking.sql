-- Per-user read cursor on a conversation: everything at or before
-- last_read_at counts as read. Viewing a thread advances the cursor.
-- The composite primary key on (conversation_id, user_id) is what the
-- messages edge function's upsert (onConflict: 'conversation_id,user_id')
-- relies on — exactly one cursor row per user per conversation.
-- No public policies — like the other chat tables, only the messages
-- edge function (service role) touches it.
create table conversation_reads (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id text not null,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
alter table conversation_reads enable row level security;
