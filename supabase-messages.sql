-- Bizomedia AI conversation history.
-- Apply after supabase-onboarding-hardening.sql and supabase-admin-access.sql.
-- AI replies are inserted only by the protected Netlify Function with the
-- server-side service role key. That key must never be exposed to the browser.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  sender_id uuid references auth.users(id) on delete cascade,
  body text not null,
  client_read_at timestamptz,
  needs_review boolean not null default false,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_role_check check (role in ('client', 'assistant')),
  constraint messages_body_check check (body = btrim(body) and char_length(body) between 1 and 2000),
  constraint messages_actor_check check (
    (role = 'client' and sender_id = client_id and needs_review = false)
    or (role = 'assistant' and sender_id is null)
  )
);

create index if not exists messages_client_created_idx
  on public.messages (client_id, created_at);

create index if not exists messages_unreviewed_idx
  on public.messages (client_id, created_at)
  where needs_review = true and reviewed_at is null;

alter table public.messages enable row level security;

revoke all on public.messages from anon, authenticated;
grant select on public.messages to authenticated;
grant update (client_read_at, reviewed_at) on public.messages to authenticated;
grant select, insert, update, delete on public.messages to service_role;

drop policy if exists "Clients can read own AI conversation" on public.messages;
create policy "Clients can read own AI conversation"
  on public.messages for select
  to authenticated
  using ((select auth.uid()) = client_id);

drop policy if exists "Staff can read AI conversations" on public.messages;
create policy "Staff can read AI conversations"
  on public.messages for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor'));

drop policy if exists "Clients can mark AI replies read" on public.messages;
create policy "Clients can mark AI replies read"
  on public.messages for update
  to authenticated
  using ((select auth.uid()) = client_id and role = 'assistant')
  with check ((select auth.uid()) = client_id and role = 'assistant');

drop policy if exists "Staff can review escalated AI replies" on public.messages;
create policy "Staff can review escalated AI replies"
  on public.messages for update
  to authenticated
  using (
    needs_review = true
    and (select auth.jwt() -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
  )
  with check (
    needs_review = true
    and (select auth.jwt() -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
  );

create or replace function public.enforce_message_read_updates()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  is_staff boolean := coalesce(
    (select auth.jwt() -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor'),
    false
  );
begin
  if new.id is distinct from old.id
    or new.client_id is distinct from old.client_id
    or new.role is distinct from old.role
    or new.sender_id is distinct from old.sender_id
    or new.body is distinct from old.body
    or new.needs_review is distinct from old.needs_review
    or new.created_at is distinct from old.created_at then
    raise exception 'Conversation content is immutable';
  end if;

  if caller_id is not null and not is_staff then
    if old.client_id <> caller_id or old.role <> 'assistant' then
      raise exception 'Not allowed';
    end if;
    if new.reviewed_at is distinct from old.reviewed_at then
      raise exception 'Clients cannot change review state';
    end if;
  elsif caller_id is not null and is_staff then
    if new.client_read_at is distinct from old.client_read_at then
      raise exception 'Staff cannot change client read state';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_message_read_updates() from public, anon, authenticated;

drop trigger if exists enforce_message_read_updates on public.messages;
create trigger enforce_message_read_updates
before update on public.messages
for each row execute function public.enforce_message_read_updates();

