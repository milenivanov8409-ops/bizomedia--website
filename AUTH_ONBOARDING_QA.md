# Registration and onboarding QA

Run these checks after the Supabase migration and frontend are published together.

## Registration

- Create a fresh account with a valid email and a strong password.
- Confirm that passwords shorter than 10 characters or without uppercase, lowercase and a digit are rejected.
- Confirm that registration cannot continue without accepting the Terms and Privacy Policy.
- Open both legal links and confirm the version date is 16 September 2026.
- Confirm the email and then sign in.
- If confirmation is delayed, use the resend confirmation button.

## Session and password recovery

- Sign in with “Remember me” enabled, close and reopen the browser, and confirm the session remains active.
- Sign in with “Remember me” disabled, close the browser, and confirm a new sign-in is required.
- Request a password-reset email and open the link once.
- Confirm a direct or expired reset link keeps the save button disabled.
- Change the password and confirm the session is closed before the next login.

## Onboarding

- Complete step 1, reload the page and confirm it resumes at step 2.
- Select at least one channel and confirm the selected channels remain after reload.
- Upload a PNG, JPG or WebP logo under 2 MB, replace it and remove it.
- Choose a preferred plan and confirm it is shown as a request, not as an activated paid plan.
- Finish onboarding and confirm the dashboard opens.

## Profile security

- Confirm a signed-in user can see and update only their own profile and files.
- Confirm the active plan cannot be changed from browser requests; only `requested_plan` is client-editable.
- Confirm profile timestamps are updated by the database trigger.
- In Supabase Auth security settings, enable leaked-password protection when it is available for the project plan.

## Dashboard settings

- Change the name, business, language, primary channel and active channels.
- Confirm at least one channel is required.
- Replace and remove the business logo.
- Send a preferred-plan request and confirm the active plan stays unchanged.
- Open the password-change flow from Settings.
