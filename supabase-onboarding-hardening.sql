-- Hardening for Bizomedia registration and onboarding.
-- Apply through the Supabase migration workflow before publishing the matching frontend.

alter table public.profiles add column if not exists requested_plan text not null default 'essential';
alter table public.profiles add column if not exists onboarding_step smallint not null default 1;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists terms_version text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_requested_plan_check' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_requested_plan_check
      check (requested_plan in ('essential', 'growth', 'business'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_onboarding_step_check' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_onboarding_step_check
      check (onboarding_step between 1 and 3);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_primary_channel_check' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_primary_channel_check
      check (primary_channel in ('Instagram', 'Facebook', 'LinkedIn', 'X', 'TikTok', 'Google Ads', 'Email'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_social_channels_check' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_social_channels_check
      check (
        cardinality(social_channels) between 1 and 7
        and array_position(social_channels, null) is null
        and social_channels <@ array['Instagram', 'Facebook', 'LinkedIn', 'X', 'TikTok', 'Google Ads', 'Email']::text[]
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_primary_in_social_channels_check' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_primary_in_social_channels_check
      check (primary_channel = any(social_channels));
  end if;
end $$;

update public.profiles
set requested_plan = plan
where requested_plan = 'essential' and plan <> 'essential';

revoke insert, update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (
  full_name,
  business_name,
  preferred_language,
  primary_channel,
  social_channels,
  requested_plan,
  logo_path,
  onboarding_step,
  onboarding_completed
) on public.profiles to authenticated;

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_profile_updated_at() from public, anon, authenticated;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_profile_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    business_name,
    preferred_language,
    primary_channel,
    social_channels,
    plan,
    requested_plan,
    logo_path,
    onboarding_step,
    onboarding_completed,
    terms_accepted_at,
    terms_version
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'business', ''),
    coalesce(new.raw_user_meta_data ->> 'preferred_language', 'bg'),
    coalesce(new.raw_user_meta_data ->> 'primary_channel', 'Instagram'),
    case
      when jsonb_typeof(new.raw_user_meta_data -> 'social_channels') = 'array'
      then array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'social_channels'))
      else array['Instagram']::text[]
    end,
    'essential',
    case
      when coalesce(new.raw_user_meta_data ->> 'requested_plan', 'essential') in ('essential', 'growth', 'business')
      then coalesce(new.raw_user_meta_data ->> 'requested_plan', 'essential')
      else 'essential'
    end,
    '',
    1,
    false,
    case when coalesce(new.raw_user_meta_data ->> 'terms_accepted', 'false') = 'true' then now() else null end,
    case when coalesce(new.raw_user_meta_data ->> 'terms_accepted', 'false') = 'true'
      then coalesce(new.raw_user_meta_data ->> 'terms_version', '')
      else ''
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
