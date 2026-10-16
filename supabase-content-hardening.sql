-- Bizomedia publication workflow hardening
-- Apply this migration immediately before publishing the matching dashboard files.

alter table public.posts
  drop constraint if exists posts_status_check;

alter table public.posts
  alter column status set default 'requested',
  add constraint posts_status_check check (
    status in ('draft', 'requested', 'in_progress', 'pending', 'approved', 'scheduled', 'published', 'changes_requested', 'cancelled')
  );

alter table public.posts
  add column if not exists client_feedback text not null default '',
  add column if not exists decision_at timestamptz;

alter table public.posts
  drop constraint if exists posts_client_feedback_check;

alter table public.posts
  add constraint posts_client_feedback_check check (char_length(client_feedback) <= 1200);

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
