-- Bizomedia RLS and index optimizations reported by Supabase Advisors.
-- Apply after supabase-channels.sql.

create index if not exists messages_sender_id_idx
  on public.messages (sender_id);

-- Keep the same client/staff access model while evaluating one policy per action.
drop policy if exists "Users can read own posts" on public.posts;
drop policy if exists "Staff can read all posts" on public.posts;
create policy "Authenticated can read allowed posts"
  on public.posts for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or ((select auth.jwt()) -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
  );

drop policy if exists "Users can create own posts" on public.posts;
drop policy if exists "Staff can create posts" on public.posts;
create policy "Authenticated can create allowed posts"
  on public.posts for insert
  to authenticated
  with check (
    (
      (select auth.uid()) = user_id
      and status = 'requested'
      and reach = 0
    )
    or (
      ((select auth.jwt()) -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
      and status in ('draft', 'in_progress')
      and reach = 0
    )
  );

drop policy if exists "Users can update own posts" on public.posts;
drop policy if exists "Staff can update all posts" on public.posts;
create policy "Authenticated can update allowed posts"
  on public.posts for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    or ((select auth.jwt()) -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
  )
  with check (
    (select auth.uid()) = user_id
    or ((select auth.jwt()) -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
  );

drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Staff can read client profiles" on public.profiles;
create policy "Authenticated can read allowed profiles"
  on public.profiles for select
  to authenticated
  using (
    (select auth.uid()) = id
    or ((select auth.jwt()) -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
  );

drop policy if exists "Clients can read own AI conversation" on public.messages;
drop policy if exists "Staff can read AI conversations" on public.messages;
create policy "Authenticated can read allowed AI conversations"
  on public.messages for select
  to authenticated
  using (
    (select auth.uid()) = client_id
    or ((select auth.jwt()) -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
  );

drop policy if exists "Clients can mark AI replies read" on public.messages;
drop policy if exists "Staff can review escalated AI replies" on public.messages;
create policy "Authenticated can update allowed AI conversation state"
  on public.messages for update
  to authenticated
  using (
    ((select auth.uid()) = client_id and role = 'assistant')
    or (
      needs_review = true
      and ((select auth.jwt()) -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
    )
  )
  with check (
    ((select auth.uid()) = client_id and role = 'assistant')
    or (
      needs_review = true
      and ((select auth.jwt()) -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
    )
  );

drop policy if exists "Clients can read own channels" on public.channel_connections;
drop policy if exists "Staff can read all channels" on public.channel_connections;
create policy "Authenticated can read allowed channels"
  on public.channel_connections for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or ((select auth.jwt()) -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
  );

drop policy if exists "Clients can update own channel details" on public.channel_connections;
drop policy if exists "Staff can maintain channel states" on public.channel_connections;
create policy "Authenticated can update allowed channels"
  on public.channel_connections for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    or ((select auth.jwt()) -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
  )
  with check (
    (select auth.uid()) = user_id
    or ((select auth.jwt()) -> 'app_metadata' ->> 'bizomedia_role') in ('admin', 'editor')
  );
