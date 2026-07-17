-- Denormalized inbox previews: kept current by trigger, so listing the inbox
-- never downloads message bodies.
alter table conversations
  add column last_message_preview text,
  add column last_message_at timestamptz;

create or replace function set_conversation_last_message() returns trigger
language plpgsql security definer as $$
begin
  update conversations
  set last_message_preview = left(split_part(new.body, E'\n', 1), 140),
      last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_set_last_message
after insert on messages
for each row execute function set_conversation_last_message();

-- Backfill from existing messages.
update conversations c
set last_message_preview = left(split_part(m.body, E'\n', 1), 140),
    last_message_at = m.created_at
from (
  select distinct on (conversation_id) conversation_id, body, created_at
  from messages
  order by conversation_id, created_at desc
) m
where m.conversation_id = c.id;

-- Chat and notifications carry PII; remove the public policies so the anon
-- key cannot touch them. All access now goes through Edge Functions
-- (service role), which verify the caller's Clerk session.
drop policy "Public read conversations" on conversations;
drop policy "Anyone can create conversations" on conversations;
drop policy "Public read messages" on messages;
drop policy "Anyone can create messages" on messages;
drop policy "Public read notifications" on notifications;
drop policy "Anyone can create notifications" on notifications;
drop policy "Anyone can update notifications" on notifications;
