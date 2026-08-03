# Task 0002 — Decide Email + Storage

**Status:** ✅ Done (2026-08-02). Choice recorded in [`../00-technical-decisions.md`](../00-technical-decisions.md) → "Decision 3 — Email Delivery Provider, Invitation Expiry/Resend Policy & Token Security" and "Decision 4 — Object Storage, Avatars & Deferred Attachments".

## Requirement

Choose and record the email delivery provider and the invitation expiry/resent policy (PRD §14 open decision #3), plus the object-storage approach for avatars and any deferred attachments. Must store no reusable raw invitation token (PRD §10 `Invitation.tokenHash`).

## Steps

1. List candidate email providers (e.g. Resend, SendGrid, Postmark, AWS SES) and evaluate cost, deliverability, templating and the ability to support invitation links.
2. Decide the invitation expiry window (e.g. 7 days) and the resend policy (how long a pending invite may be resent, and how expired invites are handled).
3. Decide that invitations store only a `tokenHash` and `status`, never the raw token (PRD §10).
4. List candidate storage options for user avatars (optional in MVP) and any future attachments, and evaluate against cost, upload size limits and privacy.
5. Record the decision, including what is deferred (attachments are out of MVP scope per FR-6).

## Recommendation

Use a **transactional email provider with an API and webhooks** (Resend or Postgres-backed SendGrid) rather than SMTP, so invite sends are observable and testable. Keep the invitation token single-use, hashed at rest, and expired server-side on a scheduled interval or lazily on read. For avatars, defer object storage until after MVP unless the chosen auth provider supplies hosted avatars; a simple signed-URL or provider-hosted avatar is preferable to standing up your own object store early. Attachments are explicitly deferred — do not build file upload in the MVP.

## Resolution (2026-08-02)

**Email provider:** **Resend** (transactional REST API + webhooks, first-class React templates via `react-email`, generous free tier at 100 emails/day for dev + early MVP). Serves **both** BetterAuth magic links (Decision 2) and project invitations — one provider, one `RESEND_API_KEY` env var (referenced by name only) with default sender from `FROM_EMAIL`. Invite/magic-link emails are rendered server-side from in-repo `emails/` templates. Deliverability/opens tracked via Resend webhooks (observability; optional in MVP).

**Invitation token security:** each invite gets a fresh high-entropy token (`crypto`, ≥256 bits); the DB stores **only `tokenHash` (SHA-256) + `status`** — the raw token exists only inside the emailed accept link and is never persisted (PRD §10).

**Invitation expiry & status:** **7 days** from the latest invite (`expiresAt` stored `timestamptz` in UTC). Status enum: `pending | accepted | declined | expired | revoked`. Expiry is enforced **server-side** — rejected lazily on every read/accept (`now > expiresAt`) and via a scheduled sweep that flips `pending` → `expired`.

**Acceptance = first-accept-wins, token is single-use:** accept runs in one transaction — verify `pending` + unexpired, mark `accepted`, create the active `ProjectMembership`, and **revoke all other `pending` invites for that project+email**. Any reuse of an accepted/expired/revoked/declined token is rejected.

**Resend policy:** while `pending` and unexpired, a member with invite permission may **resend** — this **rotates the token** (new hash) and **resets expiry to +7 days**, invalidating the old link. Expired invites are **never revived**: re-inviting creates a fresh row (UI offers "resend expired").

**Storage / avatars:** **defer standalone object storage** for the MVP. `User.avatarUrl` holds a **validated absolute URL** (auth-provider profile image or user-supplied URL) — no file upload, no S3/R2 in MVP. **Attachments are out of MVP scope** (not in PRD §10); do not build upload UI, mutations or storage now. Revisit **Vercel Blob** (native to the Vercel host, signed URLs, size/content-type limits) or **Cloudflare R2** with signed URLs post-MVP.

