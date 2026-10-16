# Bizomedia Control QA

## Channel connections

- In the client dashboard, open **Канали** and verify that all seven supported channels are shown.
- Add a channel without entering any password and confirm that its state becomes **Заявено**.
- Edit the account name and identifier and verify that only the signed-in client's row changes.
- In Bizomedia Control, open **Канални заявки**, change a requested channel to **Свързан**, and save.
- Refresh the client dashboard and confirm that the same channel now shows **Свързан**.
- Confirm that an ordinary client cannot read another client's connections or change status and analytics fields.

Run these checks after applying `supabase-admin-access.sql` and before making the internal panel part of the normal workflow.

## Access control

- Open `admin.html` while signed out and confirm the panel is not shown.
- Sign in as a normal client and confirm access is denied.
- Add `?demo=1` to the public Netlify URL and confirm access is still denied.
- Sign in as an account with `app_metadata.bizomedia_role = admin` and confirm the panel loads.
- Sign out and confirm returning to `admin.html` no longer shows client data.

## Data isolation

- Confirm an administrator sees requests from all clients.
- Confirm a normal client still sees only their own posts and profile.
- Confirm a normal client sees only their own AI conversation and cannot create assistant-role messages.
- Confirm the client cannot change title, caption, channel, date, media, reach or owner with a direct API request.
- Confirm the client can still approve a pending post or request a correction with feedback.

## Staff workflow

- Open a new request and mark it **Подготвя се**.
- Choose a goal and tone, then use **Генерирай с AI** and confirm the proposed title and caption fill the editor without being saved automatically.
- Use **Генерирай визия с AI**, review the draft and confirm it is uploaded only after an explicit save.
- Upload a PNG, JPG or WebP fallback and confirm files larger than 5 MB are rejected.
- Open **AI месечен план**, choose a client and generate 4, 8 and 12-item local plans.
- Exclude one proposed idea and confirm only the selected items are added as **В подготовка**.
- Confirm the planner does not insert anything until **Добави избраните към календара** is pressed.
- Confirm the local `?demo=1` generator does not make an external AI request or consume credits.
- Edit the title, channel, date and publication text, then save.
- Choose **Изпрати за одобрение** and confirm the client sees the post under **Одобрения**.
- Request a correction as the client and confirm the written feedback appears in Bizomedia Control.
- Edit the post and send it for approval again; confirm the old client feedback is cleared.
- Move an approved item to **Планирана**, then **Публикувана**.
- Open **AI разговори** and confirm only conversations requiring attention show a badge.
- Mark one escalated conversation as reviewed and confirm the badge clears without changing its text.

See `AI_CONTENT_SETUP.md` for the three live endpoint authorization and failure checks.

## Responsive layout

- Test the request list and editor on desktop and phone widths.
- Confirm filters, search, statuses and all action buttons remain visible.
