# Publication workflow QA

Run these checks after applying `supabase-content-hardening.sql` and publishing the matching frontend.

## Client request

- Sign in with a normal client account.
- Open **Публикации** and create a request with title, channel, future date and guidance.
- Confirm the new item appears with status **Заявена**, not **За одобрение**.
- Upload a valid JPG, PNG or WebP under 10 MB and confirm it is saved.
- Confirm a disallowed file type or image over 10 MB is rejected.

## Preparation and approval

- As an administrator or server-side process, move the request from `requested` to `in_progress`, then to `pending` after adding the final content.
- Sign back in as the client and confirm the item appears in **Одобрения**.
- Open **Прегледай** and confirm title, channel, date, caption and image are correct.
- Choose **Одобрявам** and confirm the status becomes **Одобрена**.
- Repeat with another pending item, choose **Искам корекция**, submit feedback and confirm the status becomes **За корекция**.
- Confirm an empty correction request is rejected.

## Security

- Confirm one client cannot read or update another client's posts.
- Confirm a client cannot set a new request directly to `approved`, `scheduled` or `published`.
- Confirm a client cannot edit reach, owner, title, channel, media path or schedule through a direct API update.
- Confirm a client cannot delete a post.
- Confirm a client can only change `pending` to `approved` or `changes_requested`, and `requested` to `cancelled`.

## Responsive layout

- Test **Публикации**, **Одобрения** and the review dialog on a phone-width screen.
- Confirm all fields and the **Прегледай** button are visible without horizontal scrolling.
- Confirm both decision buttons remain readable and usable.
