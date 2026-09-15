-- Bizomedia client profiles. Safe to run more than once.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  business_name text not null default '',
  preferred_language text not null default 'bg' check (preferred_language in ('bg', 'en')),
  primary_channel text not null default 'Instagram',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, business_name, preferred_language, primary_channel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'business', ''),
    coalesce(new.raw_user_meta_data ->> 'preferred_language', 'bg'),
    coalesce(new.raw_user_meta_data ->> 'primary_channel', 'Instagram')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create profiles for users who registered before this table existed.
insert into public.profiles (id, full_name, business_name, preferred_language, primary_channel)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', ''),
  coalesce(raw_user_meta_data ->> 'business', ''),
  coalesce(raw_user_meta_data ->> 'preferred_language', 'bg'),
  coalesce(raw_user_meta_data ->> 'primary_channel', 'Instagram')
from auth.users
on conflict (id) do nothing;
