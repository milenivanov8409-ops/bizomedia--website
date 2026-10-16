-- Bizomedia staff access for the internal Control panel.
-- Apply after supabase-content-hardening.sql and supabase-onboarding-hardening.sql.
-- Staff roles live in protected auth app_metadata, never in user_metadata.

drop policy if exists "Staff can read all posts" on public.posts;
create policy "Staff can read all posts"
  on public.posts for select
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
  );

drop policy if exists "Staff can update all posts" on public.posts;
create policy "Staff can update all posts"
  on public.posts for update
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
  )
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
  );

drop policy if exists "Staff can create posts" on public.posts;
create policy "Staff can create posts"
  on public.posts for insert
  to authenticated
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
    and status in ('draft', 'in_progress')
    and reach = 0
  );

drop policy if exists "Staff can read client profiles" on public.profiles;
create policy "Staff can read client profiles"
  on public.profiles for select
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
  );

-- Authenticated users share one Postgres role. Column grants therefore allow
-- the staff editor fields, while RLS and the trigger below enforce who can use them.
revoke update on public.posts from authenticated;
grant update (
  title,
  caption,
  channel,
  status,
  scheduled_at,
  media_url,
  media_path,
  reach,
  client_feedback
) on public.posts to authenticated;

grant insert (
  user_id,
  title,
  caption,
  channel,
  status,
  scheduled_at,
  media_path
) on public.posts to authenticated;

create or replace function public.enforce_client_post_update()
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
  if (select auth.uid()) is not null and not is_staff then
    if old.user_id <> (select auth.uid()) then
      raise exception 'Not allowed';
    end if;

    if new.user_id is distinct from old.user_id
      or new.title is distinct from old.title
      or new.caption is distinct from old.caption
      or new.channel is distinct from old.channel
      or new.scheduled_at is distinct from old.scheduled_at
      or new.media_url is distinct from old.media_url
      or new.media_path is distinct from old.media_path
      or new.reach is distinct from old.reach then
      raise exception 'Clients cannot edit protected publication fields';
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

  if is_staff and new.status = 'pending' and old.status is distinct from 'pending' then
    new.client_feedback := '';
    new.decision_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.enforce_client_post_update() from public, anon, authenticated;

drop trigger if exists enforce_client_post_update on public.posts;
create trigger enforce_client_post_update
before update on public.posts
for each row execute function public.enforce_client_post_update();

-- Staff can view and maintain publication media without exposing another
-- client's files to ordinary authenticated users.
drop policy if exists "Staff can read post media" on storage.objects;
create policy "Staff can read post media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'post-media'
    and (select auth.jwt() -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
  );

drop policy if exists "Staff can create post media" on storage.objects;
create policy "Staff can create post media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-media'
    and (select auth.jwt() -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
  );

drop policy if exists "Staff can update post media" on storage.objects;
create policy "Staff can update post media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'post-media'
    and (select auth.jwt() -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
  )
  with check (
    bucket_id = 'post-media'
    and (select auth.jwt() -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
  );

drop policy if exists "Staff can delete post media" on storage.objects;
create policy "Staff can delete post media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-media'
    and (select auth.jwt() -> 'app_metadata' ->> 'bizomedia_role') = 'admin'
  );
