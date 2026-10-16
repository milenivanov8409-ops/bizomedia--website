# Changelog

## 2026-09-18

- Rebuilt the client Channels area with seven supported marketing channels.
- Added secure per-client connection requests, editable account details and clear connection states.
- Added a protected `channel_connections` schema with RLS, ownership checks and staff-only analytics fields.
- Added TikTok consistently to onboarding, profile settings, post creation and database constraints.
- Kept the local demo fully functional without third-party OAuth keys or external API usage.

## 2026-09-17 — AI-assisted content preparation

- Added an authenticated Bizomedia AI assistant that answers clients automatically inside My Bizomedia Studio.
- Added safe client, profile, publication-status and recent-conversation context for relevant AI replies.
- Added automatic escalation for billing, legal, privacy, security, complaint and human-support requests.
- Added a protected AI conversation history with client isolation, immutable content and staff-only review state.
- Added a zero-credit local assistant and an AI conversation review screen in Bizomedia Control.
- Added a protected AI monthly planner for 4, 8 or 12 publication ideas.
- Added client, month, goal and campaign-direction controls with per-item review and selection.
- Added bulk calendar insertion only after explicit staff confirmation.
- Added a localhost-only monthly-plan generator that consumes no credits.
- Added staff-only insert policies for reviewed calendar drafts while preserving client insert restrictions.
- Added AI-generated social visuals with a clear draft preview inside Bizomedia Control.
- Added a protected, staff-only Netlify image-generation function using a low-quality 1024 × 1024 WebP draft.
- Added rate limits to both AI endpoints to reduce accidental credit use.
- Added private Supabase media upload only after an explicit save, using unique storage paths.
- Added PNG, JPG and WebP manual upload as a fallback.
- Added an AI preparation panel inside the Bizomedia Control request editor.
- Added goal, tone and optional direction controls for each publication.
- Added a protected Netlify Function that verifies Supabase staff roles before calling AI Gateway.
- Added low-cost `gpt-4.1-mini` text generation with strict input and output limits.
- Added prompt-injection boundaries and rules against invented business claims.
- Added generated titles, captions, calls to action, hashtags and people-free visual directions.
- Kept all AI results in review state until a staff member explicitly saves or sends them.
- Added a localhost-only, zero-credit demo generator for safe workflow testing.

## 2026-09-16 — Bizomedia Control workspace

- Added a protected internal workspace for Bizomedia administrators and editors.
- Added client-request metrics, workflow filters and publication search.
- Added a staff editor for title, channel, date, caption and publication status.
- Added one-click actions to start preparation and send finished content for client approval.
- Added prominent client correction feedback inside the editor.
- Added RLS policies for staff access using protected Auth `app_metadata` roles.
- Preserved client isolation with database-enforced protected publication fields.
- Added staff media policies without exposing service-role or secret keys to the browser.
- Added a localhost-only demo mode and responsive desktop/mobile layouts.

## 2026-09-16 — Publication request and approval workflow

- Separated a new client request from content that is ready for approval.
- Added the full status flow: requested, in progress, pending approval, approved, changes requested, scheduled, published and cancelled.
- Added a focused publication review dialog with approval and written correction feedback.
- Added database-enforced client status transitions and database-managed update timestamps.
- Restricted client inserts and updates to safe post columns and removed client delete access.
- Added stricter image MIME validation and safer generated storage filenames.
- Added a responsive card layout for publication and approval tables on mobile.
- Added local demo content for testing the complete workflow without changing production data.

## 2026-09-16 — Registration and onboarding hardening

- Added real persistent/session-only “Remember me” behaviour.
- Added resend-confirmation and safer password-recovery flows.
- Added stronger password requirements and Bulgarian authentication errors.
- Linked registration consent to the Terms and Privacy Policy and recorded their version.
- Added resumable three-step onboarding.
- Added replace/remove flows for business logos with safer storage cleanup.
- Separated a requested plan from the server-controlled active plan.
- Restricted client-editable profile columns and added channel constraints.
- Added database-managed profile update timestamps.
- Expanded dashboard profile, channel, plan and security settings.
- Updated the Terms and Privacy Policy for accounts and the client portal.
