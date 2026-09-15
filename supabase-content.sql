-- Bizomedia client content workspace
-- Run once in the Supabase SQL Editor for project bvhbjkeltgltqwovjidl.

create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  caption text not null default '' check (char_length(caption) <= 1200),
  channel text not null default 'Instagram' check (
    channel in ('Instagram', 'Facebook', 'LinkedIn', 'X', 'Google Ads', 'Email')
  ),
  status text not null default 'draft' check (
    status in ('draft', 'pending', 'approved', 'scheduled', 'published', 'changes_requested')
  ),
  scheduled_at timestamptz,
  media_url text,
  reach integer not null default 0 check (reach >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_user_schedule_idx
  on public.posts (user_id, scheduled_at);

alter table public.posts enable row level security;

drop policy if exists "Users can read own posts" on public.posts;
create policy "Users can read own posts"
  on public.posts for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create own posts" on public.posts;
create policy "Users can create own posts"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
  on public.posts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.posts to authenticated;
