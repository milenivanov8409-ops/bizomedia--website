-- Bizomedia channel connection requests.
-- Apply after supabase-onboarding-hardening.sql and supabase-admin-access.sql.
-- OAuth access and refresh tokens must live in a protected server-side store,
-- never in this browser-readable table.

create table if not exists public.channel_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  provider text not null,
  account_name text not null,
  account_identifier text not null,
  status text not null default 'requested',
  posts_synced integer not null default 0,
  reach_30d bigint not null default 0,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint channel_connections_provider_check check (
    provider in ('Instagram', 'Facebook', 'LinkedIn', 'X', 'TikTok', 'Google Ads', 'Email')
  ),
  constraint channel_connections_status_check check (
    status in ('requested', 'connected', 'action_required', 'disconnected')
  ),
  constraint channel_connections_account_name_check check (
    account_name = btrim(account_name) and char_length(account_name) between 1 and 120
  ),
  constraint channel_connections_identifier_check check (
    account_identifier = btrim(account_identifier) and char_length(account_identifier) between 1 and 180
  ),
  constraint channel_connections_metrics_check check (posts_synced >= 0 and reach_30d >= 0),
  constraint channel_connections_user_provider_key unique (user_id, provider)
);

create index if not exists channel_connections_user_status_idx
  on public.channel_connections (user_id, status, updated_at desc);

alter table public.channel_connections enable row level security;

revoke all on public.channel_connections from public, anon, authenticated;
grant select, delete on public.channel_connections to authenticated;
grant insert (user_id, provider, account_name, account_identifier) on public.channel_connections to authenticated;
grant update (account_name, account_identifier, status, posts_synced, reach_30d, last_synced_at) on public.channel_connections to authenticated;

drop policy if exists "Clients can read own channels" on public.channel_connections;
create policy "Clients can read own channels"
  on public.channel_connections for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Clients can request own channels" on public.channel_connections;
create policy "Clients can request own channels"
  on public.channel_connections for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'requested'
    and posts_synced = 0
    and reach_30d = 0
    and last_synced_at is null
  );

drop policy if exists "Clients can update own channel details" on public.channel_connections;
create policy "Clients can update own channel details"
  on public.channel_connections for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Clients can remove own channels" on public.channel_connections;
create policy "Clients can remove own channels"
  on public.channel_connections for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Staff can read all channels" on public.channel_connections;
create policy "Staff can read all channels"
  on public.channel_connections for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor'));

drop policy if exists "Staff can maintain channel states" on public.channel_connections;
create policy "Staff can maintain channel states"
  on public.channel_connections for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor'))
  with check ((select auth.jwt() -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor'));

create or replace function public.enforce_channel_connection_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  is_staff boolean := coalesce(
    (select auth.jwt() -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor'),
    false
  );
begin
  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.provider is distinct from old.provider
    or new.created_at is distinct from old.created_at then
    raise exception 'Channel ownership is immutable';
  end if;

  if (select auth.uid()) is not null and not is_staff then
    if old.user_id <> (select auth.uid()) then
      raise exception 'Not allowed';
    end if;
    if new.status is distinct from old.status
      or new.posts_synced is distinct from old.posts_synced
      or new.reach_30d is distinct from old.reach_30d
      or new.last_synced_at is distinct from old.last_synced_at then
      raise exception 'Clients cannot change connection state or analytics';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.enforce_channel_connection_update() from public, anon, authenticated;

drop trigger if exists enforce_channel_connection_update on public.channel_connections;
create trigger enforce_channel_connection_update
before update on public.channel_connections
for each row execute function public.enforce_channel_connection_update();

-- Keep content and onboarding channel options aligned with the public website.
alter table public.profiles drop constraint if exists profiles_primary_channel_check;
alter table public.profiles add constraint profiles_primary_channel_check
  check (primary_channel in ('Instagram', 'Facebook', 'LinkedIn', 'X', 'TikTok', 'Google Ads', 'Email'));

alter table public.profiles drop constraint if exists profiles_social_channels_check;
alter table public.profiles add constraint profiles_social_channels_check check (
  cardinality(social_channels) between 1 and 7
  and array_position(social_channels, null) is null
  and social_channels <@ array['Instagram', 'Facebook', 'LinkedIn', 'X', 'TikTok', 'Google Ads', 'Email']::text[]
);

alter table public.posts drop constraint if exists posts_channel_check;
alter table public.posts add constraint posts_channel_check
  check (channel in ('Instagram', 'Facebook', 'LinkedIn', 'X', 'TikTok', 'Google Ads', 'Email'));
