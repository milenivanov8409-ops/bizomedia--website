# Bizomedia Control setup

The internal panel is available at `admin.html`. It never contains a Supabase secret or service-role key. The AI assistant uses its service-role key only inside the protected Netlify Function.

## Release order

1. Apply `supabase-onboarding-hardening.sql`.
2. Apply `supabase-content-hardening.sql`.
3. Apply `supabase-admin-access.sql`.
4. Apply `supabase-messages.sql`.
5. Apply `supabase-channels.sql`.
6. Apply `supabase-advisor-hardening.sql`.
7. Add `SUPABASE_SERVICE_ROLE_KEY` to Netlify environment variables only.
8. Give the owner account an administrator role from the Supabase SQL Editor.
9. Sign out and sign in again so the refreshed access token contains the role.
10. Publish the matching frontend files.

## Give the owner account access

Replace the placeholder with the exact owner email before running this statement in the Supabase SQL Editor:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('bizomedia_role', 'admin')
where lower(email) = lower('YOUR_OWNER_EMAIL');
```

Verify that exactly one account has the role:

```sql
select id, email, raw_app_meta_data ->> 'bizomedia_role' as bizomedia_role
from auth.users
where raw_app_meta_data ->> 'bizomedia_role' in ('admin', 'editor');
```

Use `editor` for a future team member who may manage content but must not delete media. Never put this role in `user_metadata`, because users can edit their own user metadata.

## Local preview

While working locally, open:

`http://127.0.0.1:4173/admin.html?demo=1`

The demo mode is accepted only on `localhost`, `127.0.0.1` or a local file. Adding `?demo=1` to the public Netlify URL does not bypass authentication.
