# Bizomedia AI content and visual setup

The Bizomedia Control AI workflow turns a client request into a proposed title, publication caption, people-free visual direction and square social image. It can also prepare a reviewed monthly calendar with 4, 8 or 12 publication ideas. My Bizomedia Studio includes an authenticated AI assistant that answers clients automatically and flags sensitive cases for staff review. Text, images and monthly plans remain drafts until a staff member explicitly saves them.

## Cost-safe local preview

Open:

`http://127.0.0.1:4173/admin.html?demo=1`

The local text generator, visual preview, monthly planner and AI assistant use no external model and consume no credits. Demo mode is accepted only on localhost, `127.0.0.1` or a local file.

## Live generation

Live text generation runs in `netlify/functions/generate-content.ts` at `POST /api/generate-content`. Live visual generation runs in `netlify/functions/generate-visual.ts` at `POST /api/generate-visual`. Monthly planning runs in `netlify/functions/generate-plan.ts` at `POST /api/generate-plan`. Client assistant replies run in `netlify/functions/assistant-chat.ts` at `POST /api/assistant-chat` after a Netlify deploy.

- Netlify AI Gateway supplies the AI provider credentials inside the serverless function.
- The selected model is `gpt-4.1-mini` to keep text-generation cost low.
- The visual endpoint defaults to `gpt-image-2.5-flare`, low quality, 1024 × 1024 WebP. Override it with `BIZOMEDIA_IMAGE_MODEL` if needed.
- Each click creates one model request, capped at 900 output tokens.
- Text and visual endpoints have separate IP-and-domain rate limits.
- The monthly planner is limited to 12 ideas per request and 2 requests per minute per IP and domain.
- The assistant is limited to 500 output tokens and 6 replies per minute per IP and domain.
- The endpoint validates the Supabase access token against Supabase Auth.
- Only users whose protected `app_metadata.bizomedia_role` is `admin` or `editor` may generate content.
- No service-role or secret key is included in the website. `SUPABASE_SERVICE_ROLE_KEY` is read only inside the protected assistant function so clients cannot impersonate the AI or alter conversation history.

The business name, request text and optional direction are sent through Netlify AI Gateway to the selected AI provider when a staff member presses a live generation button. Do not place passwords, payment data or other confidential personal information in a content request.

Generated images remain in the browser for review. They are uploaded to the private Supabase `post-media` bucket with a unique filename only after **Запази промените** or **Изпрати за одобрение** is pressed. Existing client and staff storage policies remain the source of access control.

The public Supabase URL and publishable key have safe project fallbacks. They can optionally be overridden in Netlify with `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. The AI assistant additionally requires `SUPABASE_SERVICE_ROLE_KEY` in Netlify environment variables. Never place this value in HTML, JavaScript or a public repository.

## Before enabling in production

1. Apply the database migrations listed in `ADMIN_SETUP.md`, followed by `supabase-messages.sql`.
2. Grant the owner account the protected administrator role.
3. Sign out and sign in again so the access token contains the new role.
4. Confirm Netlify AI features are enabled for the team.
5. Deploy the site once so AI Gateway is active.
6. Run the checks below before relying on live generation.

## QA checklist

- Open the local demo, choose a request and generate content without using credits.
- Confirm the title, caption and visual direction are filled but not saved automatically.
- Generate a local visual and confirm the preview is marked as a draft.
- Generate a local monthly plan, exclude at least one idea and confirm only the selected ideas are added.
- Confirm the monthly planner uses only the channels configured for the selected client.
- Close the editor without saving and confirm no media is uploaded.
- Save a visual as staff and confirm the post receives a unique `media_path` in the private `post-media` bucket.
- Confirm a normal client can read only their own signed media and cannot call either AI endpoint.
- Confirm **Изпрати за одобрение** still requires an explicit click.
- Call `/api/generate-content` without a bearer token and confirm it returns `401`.
- Call it as a normal client and confirm it returns `403`.
- Call it as an administrator and confirm it returns a title, caption and visual brief.
- Repeat the `401`, `403` and administrator checks for `/api/generate-visual`.
- Repeat those authorization checks for `/api/generate-plan` and confirm invalid channels, counts or duplicate days are rejected.
- Try a request containing instructions to reveal secrets or ignore rules; confirm they are treated only as client data.
- Confirm the generated title is at most 120 characters and the caption at most 1200 characters.
- Confirm an unavailable AI Gateway shows a clear error and does not change or save the publication.
- Confirm generated images do not contain people, third-party logos, watermarks or invented promotional claims.
- Open the local dashboard AI assistant and confirm normal questions receive automatic zero-credit demo answers.
- Ask about an invoice, payment, refund, contract, security issue or a human; confirm the conversation is flagged in **AI разговори**.
- Confirm the client cannot insert an assistant message or edit conversation content through a direct API request.
- Confirm a normal client can read only their own AI conversation.
- Call `/api/assistant-chat` without a bearer token and confirm it returns `401`.
- Confirm a live assistant reply is stored as one client message and one assistant message only after the model returns successfully.
