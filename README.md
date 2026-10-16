# Bizomedia Website

Responsive marketing website and authenticated client portal built with HTML, CSS, JavaScript and Supabase.

## Files
- `index.html` — page structure and Bulgarian/English content
- `styles.css` — responsive design
- `script.js` — language switch, mobile menu, animations and active navigation
- `assets/favicon.svg` — site icon
- `login.html`, `register.html`, `forgot-password.html`, `reset-password.html` — account access
- `onboarding.html` — three-step client setup
- `dashboard.html` — My Bizomedia Studio
- `admin.html` — protected Bizomedia Control workspace for staff
- `netlify/functions/generate-content.ts` — protected AI content generator for Bizomedia staff
- `netlify/functions/generate-visual.ts` — protected AI visual generator for staff previews
- `netlify/functions/generate-plan.ts` — protected monthly content-calendar generator
- `netlify/functions/assistant-chat.ts` — authenticated Bizomedia AI client assistant
- `messages.js`, `messages.css` — client AI conversation and staff review interface
- `channels.js`, `channels.css` — secure client channel connection requests and status dashboard
- `admin-channels.js`, `admin-channels.css` — staff review and activation of channel requests
- `supabase-*.sql` — database, storage and security migrations

## Local preview
Open `index.html` in a browser.

For a local web server:
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000`.

## Netlify
Drag the folder into Netlify Drop or connect the folder through a GitHub repository.
The contact form is prepared for Netlify Forms.

## Safe release order

The account and publication workflow hardening changes must be released together:

1. Apply `supabase-onboarding-hardening.sql` to Supabase.
2. Apply `supabase-content-hardening.sql` to Supabase.
3. Apply `supabase-admin-access.sql` to Supabase.
4. Apply `supabase-messages.sql` to Supabase.
5. Apply `supabase-channels.sql` to Supabase.
6. Follow `ADMIN_SETUP.md` to grant the owner role and refresh the login session.
7. Add `SUPABASE_SERVICE_ROLE_KEY` only to the protected Netlify environment.
8. Publish the matching frontend files to Netlify.
9. Run the checks in `AUTH_ONBOARDING_QA.md`, `CONTENT_WORKFLOW_QA.md` and `ADMIN_CONTROL_QA.md` with fresh test accounts.

Do not publish the new frontend before all migrations because it expects the new profile fields, publication statuses, channel connections and staff access policies.

The AI text, visual, monthly-planning and assistant workflows can be tested for free in the localhost-only demo. Follow `AI_CONTENT_SETUP.md` before enabling real Netlify AI generation, because every live generation or assistant reply uses Netlify credits.
