-- Bizomedia client content workspace
-- Run once in the Supabase SQL Editor for project bvhbjkeltgltqwovjidl.

create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  caption text not null default '' check (char_length(caption) <= 1200),
  channel text not null default 'Instagram' check (
    channel in ('Instagram', 'Facebook', 'LinkedIn', 'X', 'TikTok', 'Google Ads', 'Email')
  ),
  status text not null default 'requested' check (
    status in ('draft', 'requested', 'in_progress', 'pending', 'approved', 'scheduled', 'published', 'changes_requested', 'cancelled')
  ),
  scheduled_at timestamptz,
  media_url text,
  media_path text,
  client_feedback text not null default '' check (char_length(client_feedback) <= 1200),
  decision_at timestamptz,
  reach integer not null default 0 check (reach >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_user_schedule_idx
  on public.posts (user_id, scheduled_at);

create or replace function public.enforce_client_post_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    if old.user_id <> (select auth.uid()) then
      raise exception 'Not allowed';
    end if;

    if old.status = 'pending' and new.status in ('approved', 'changes_requested') then
      if new.status = 'changes_requested' and btrim(new.client_feedback) = '' then
        raise exception 'Feedback is required for a correction request';
      end if;
      new.decision_at := now();
    elsif old.status = 'requested' and new.status = 'cancelled' then
      new.decision_at := now();
    else
      raise exception 'This status change is not allowed';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists enforce_client_post_update on public.posts;
create trigger enforce_client_post_update
before update on public.posts
for each row execute function public.enforce_client_post_update();

alter table public.posts enable row level security;

drop policy if exists "Users can read own posts" on public.posts;
create policy "Users can read own posts"
  on public.posts for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own posts" on public.posts;
create policy "Users can create own posts"
  on public.posts for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'requested'
    and reach = 0
  );

drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
  on public.posts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own posts" on public.posts;

revoke all on public.posts from public, anon, authenticated;
grant select on public.posts to authenticated;
grant insert (user_id, title, caption, channel, scheduled_at, media_path) on public.posts to authenticated;
grant update (status, client_feedback) on public.posts to authenticated;
