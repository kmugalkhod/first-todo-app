# DECISIONS.md — Architecture Decision Record

**Status:** ✅ Accepted (2026-08-02)
**Owner:** Project maintainer (sole developer of the Shared MVP)
**Source of truth:** This file consolidates the decisions recorded in [`context/Stories/00-technical-decisions.md`](./context/Stories/00-technical-decisions.md) and Tasks [`0000`](./context/Stories/Task/0000-decision-host-and-database.md), [`0001`](./context/Stories/Task/0001-decision-auth-provider.md) and [`0002`](./context/Stories/Task/0002-decision-email-and-storage.md).

This is a lightweight ADR: each entry records **status, context, decision, alternatives considered and rejected, rationale and consequences** (including trade-offs). It is a reference, not a design document — implementation detail lives in the story/task files. Subsequent Stories reference this file and do not re-litigate these decisions.

> **Secrets policy:** No secrets, tokens, private keys or raw invitation tokens are ever stored in this repository. Only **environment-variable names** are referenced (e.g. `DATABASE_URL`, `RESEND_API_KEY`, `FROM_EMAIL`). See [Secret management](#secret-management).

## PRD §14 open decisions — resolution summary

Every PRD §14 open decision is resolved here or explicitly deferred:

| # | PRD §14 open decision | Status | Resolution |
|---|---|---|---|
| 1 | Authentication provider & sign-in methods | ✅ Resolved | BetterAuth, magic-link (primary) + Google; Entra ID & email+password deferred. See [Decision 2](#decision-2--authentication-provider-sign-in-methods--session-strategy). |
| 2 | Database & hosting, backups/retention | ✅ Resolved | Vercel + Neon Postgres + Drizzle; daily PITR, 7-day retention. See [Decision 1](#decision-1--hosting-database-orm-migrations--backupretention). |
| 3 | Email provider & invitation expiry/resent policy | ✅ Resolved | Resend; 7-day expiry, resend rotates token, hashed-at-rest. See [Decision 3](#decision-3--email-delivery-provider-invitation-expiryresend-policy--token-security). |
| 4 | Viewer access in first release? | ✅ Resolved (this file) | Deferred until Editor collaboration works. See [Decision 5](#decision-5--viewer-role-staging). |
| 5 | Inbox tasks strictly private? | ⏸ Deferred (product) | PRD assumption stands: Inbox/personal tasks are private until a future decision converts them to shared project tasks. Not an implementation decision. |
| 6 | Product name, domain, privacy/terms copy | ⏸ Deferred (product) | Product/branding decision, out of ADR scope; revisit pre-release. |

---

## Decision 1 — Hosting, Database, ORM, Migrations & Backup/Retention

**Status:** ✅ Accepted (2026-08-02)

### Context

The PRD data model (§10) requires a relational store: many-to-many `TaskLabel` join, self-referential sub-tasks (`Task.parentTaskId`, parent/child share project), `ProjectMembership` uniques, soft-deleted `Comment`, append-only `ActivityEvent`. NFRs require atomic persistence (e.g. `Project` + owner membership in one transaction), recoverable errors, UTC time handling, and an authenticated project view under 2.5s.

### Decision

| Concern | Choice |
|---|---|
| Hosting | **Vercel** — Next.js-native managed serverless; Server Actions / Server Components run in-region; no VM/container to patch. |
| Database | **Neon** — managed serverless **PostgreSQL**; full relational integrity, native `timestamptz`. |
| ORM / data access | **Drizzle ORM** (TypeScript-first, lightweight) with **`drizzle-kit`** migrations. |
| Migrations | Versioned `drizzle-kit` files applied in a release/CI step; database **branching** for dev/preview. Migrations always go forward; never direct schema edits. |
| Time storage | All timestamps `timestamptz` in **UTC** (PRD §11); rendered in the user's browser timezone. |
| Backups / retention | Automatic **daily backups with point-in-time recovery (PITR)**; default retention **7 days** (extendable on the provider's paid tier). |

### Alternatives considered & rejected

| Option | Rejected because |
|---|---|
| SQLite / libSQL (production) | Not relational/lock-safe enough for concurrent multi-member projects; `timestamptz` must be mirrored as text. Allowed only as a **local dev mirror** (mind dialect differences). |
| PlanetScale | MySQL-based; requires modifying `timestamptz` semantics; adds serverless-driver indirection. |
| Supabase (as DB host) | Viable Postgres; rejected as primary because its auth/storage value-add belongs to Decisions 2/4 and auth is deliberately isolated from the DB. Retained as fallback. |
| Fly.io / Railway / Render (containers) | Self-managed VMs/containers, OS patching and self-run DB with no reliability benefit; slower to reach the 2.5s NFR. |

**Primary:** Vercel + Neon Postgres + Drizzle ORM.
**Alternative:** Railway (or Supabase platform) + managed Postgres + Drizzle; SQLite only as a local dev mirror.

### Consequences / trade-offs

- **+** Managed Postgres gives atomic transactions, FKs and PITR backups for free; Drizzle keeps the data-access layer small and type-safe inside Server Actions.
- **+** `timestamptz` matches the UTC-storage NFR directly; timezone rendering stays a presentation concern.
- **—** Neon is serverless with connection limits and cold-start latency; must be monitored to keep the <2.5s view (mitigate with pooled connections and bounded query pages).
- **—** Hosting and DB are separate providers (Vercel + Neon); secrets live in Vercel env vars / secret manager, referenced by name only.
- **—** Vercel cold starts + Neon cold pool can occasionally exceed 2.5s on first hit; mitigated with region co-location and pooled, warm connections.

---

## Decision 2 — Authentication Provider, Sign-in Methods & Session Strategy

**Status:** ✅ Accepted (2026-08-02)

### Context

The app is Next.js 16 App Router / React 19 with Server Components and Server Actions on Vercel + Neon + Drizzle (Decision 1). FR-2 requires an invitee to authenticate **with the invited email**, so every chosen method must yield a verified email that maps onto `User.authProviderId` and onto `Invitation.email` matching.

### Decision

| Concern | Choice |
|---|---|
| Provider | **BetterAuth** — open-source (MIT), code-first, TypeScript-first, self-hosted on Vercel; auth in the app layer, isolated from the DB. |
| Adapter / persistence | **Drizzle adapter** (`@better-auth/drizzle`) against Neon Postgres: `user`, `session`, `account`, `verification` tables. |
| Sign-in methods | **Email magic link (passwordless)** — primary — plus **Google OAuth** for convenience; **Microsoft Entra ID** and **email+password** deferred/optional (built into the library; no provider switch needed later). |
| Identity | Every method yields a **verified email**; the internal `User` row is keyed by `authProviderId` (OAuth → stable external id; magic link → verified email) and created/updated on each authenticated entry in the data-access layer. |
| Session strategy | **Database-backed sessions** (default): real-time revocation, single indexed pooled lookup within the 2.5s NFR. Stateless **JWT mode** is the documented fallback if session lookups ever show up hot. |
| Server-side auth | BetterAuth server helper (`auth.api.getSession({ headers })`) used in **Server Components and every Server Action** to authorise the actor. |
| Unauthenticated redirect | BetterAuth middleware helper (`getSessionCookie`) plus guarded layout/route reads redirect to `/sign-in`; protected data never ships to unauthenticated responses or client bundles. |

### Alternatives considered & rejected

| Option | Rejected because |
|---|---|
| Auth.js (NextAuth) v5 | Mature and battle-tested with first-class App Router/Server Action support; rejected as primary only because BetterAuth offers sharper code-first DX, first-class magic-link + database sessions, and a cleaner Drizzle fit. **Retained as primary fallback.** |
| Clerk | Hosted sign-in and multi-method auth out of the box, but adds a paid per-MAU third-party dependency and lock-in on an already self-hosted stack; moves identity out of the app layer. |
| Supabase Auth | Couples auth to the DB provider rejected as primary in Decision 1; we want app-layer auth isolated from the DB. Fallback only. |
| Lucia | **Deprecated/archived by its maintainer (2025)**; too high a maintenance/security risk for a long-term project. |
| Custom session implementation | Full control but a large security surface (issuance/rotation, CSRF, password hashing/reset, revocation) best delegated to a maintained, widely-audited framework. |

**Primary:** BetterAuth (magic link + Google) with the Drizzle adapter, database-backed sessions.
**Alternative:** Auth.js v5 if BetterAuth proves immature (minimal behavioural change); Clerk if a fully hosted multi-method solution is later preferred.

### Consequences / trade-offs

- **+** Free, self-hosted, MIT, code-first; verified email directly supports the FR-2 accept flow and a stable `authProviderId`.
- **+** Database sessions give real-time revocation; JWT mode is a documented fallback.
- **+** Microsoft and email+password are built in, so adding them later needs no provider change.
- **—** BetterAuth is younger/less battle-tested than Auth.js v5; adopted while no code depends on it (Story 00) — ratified when Story 01 Task 0100 is implemented.
- **—** Database-session mode adds a per-request session read (mitigated by a single indexed query + pooled connection).
- **—** Magic link depends on email delivery (Decision 3).
- **—** Adds library-owned schema tables to migrate (tracked in Task 0101).

---

## Decision 3 — Email Delivery Provider, Invitation Expiry/Resend Policy & Token Security

**Status:** ✅ Accepted (2026-08-02)

### Context

FR-2 requires invitees to authenticate with the invited email, and PRD §10 forbids persisting a reusable raw invitation token. Magic-link (Decision 2) and project-invitation emails can share one provider.

### Decision

| Concern | Choice |
|---|---|
| Provider | **Resend** — transactional REST API + webhooks; first-class `react-email` templates; free tier (100 emails/day) covers dev + early MVP. One provider serves **both** magic links and invitations. |
| Templates | In-repo `emails/` `react-email` templates rendered server-side and sent via the Resend API. |
| Token security | Fresh high-entropy token per invite (`crypto`, ≥256 bits); DB stores **only `tokenHash` (SHA-256) + `status`** — raw token exists only inside the emailed accept link, never persisted. |
| Expiry | **7 days** from the latest invite; `expiresAt` stored `timestamptz` UTC. |
| Status enum | `pending \| accepted \| declined \| expired \| revoked`. |
| Expiry enforcement | Server-side only — rejected lazily on read/accept (`now > expiresAt`) **and** a scheduled sweep flipping `pending` → `expired`. |
| Acceptance | **First-accept-wins**, token single-use: one transaction verifies `pending` + unexpired, marks `accepted`, creates the active `ProjectMembership`, and **revokes all other `pending` invites for that project+email**. Reuse of any consumed/expired/revoked/declined token is rejected. |
| Resend policy | While `pending` and unexpired, a member with invite permission may **resend**: **rotates the token** (new hash) and **resets expiry to +7 days**, invalidating the old link. Expired invites are **never revived** — re-inviting creates a fresh row (UI offers "resend expired"). |
| Secrets | `RESEND_API_KEY` and `FROM_EMAIL` referenced by env-var name only. |

### Alternatives considered & rejected

SendGrid and Postmark were considered. Rejected in favour of Resend for its simple REST API + webhooks (delivery visibility), first-class Next.js/React templating, and generous dev-tier allowance — keeping MVP cost at ~$0 while production-ready. AWS SES is a viable option if transactional volumes grow.

**Primary:** Resend. **Alternative:** Postgres-backed SendGrid; AWS SES later at scale.

### Consequences / trade-offs

- **+** One provider and one secret for both magic links and invites; webhooks give delivery observability.
- **+** Single-use, SHA-256-hashed tokens satisfy §10 security and Privacy NFRs — no raw token at rest; first-accept-wins prevents reuse.
- **+** No object-store cost or ops in the MVP.
- **—** MVP depends on email deliverability for sign-in and invites; webhooks + scheduled sweep mitigate, but degraded delivery shows up as slow acceptance.
- **—** Lazy + scheduled expiry means an invite is only marked `expired` once checked or swept — acceptable because acceptance always re-checks `expiresAt`.
- **—** Free tier caps daily sends; must be upgraded before meaningful load.

---

## Decision 4 — Object Storage, Avatars & Deferred Attachments

**Status:** ✅ Accepted (2026-08-02)

### Context

PRD §10 `User` only includes `avatarUrl` (FR-1 lists the avatar as "optional"); attachments are not modelled at all. Standing up an object store early adds cost and ops with no MVP requirement.

### Decision

| Concern | Choice |
|---|---|
| Avatar storage | **Defer standalone object storage** for the MVP. `User.avatarUrl` (PRD §10) holds a **validated absolute URL** — auth-provider profile image or user-supplied URL. No file upload, no S3/R2 in the MVP. |
| Attachments | **Out of MVP scope** (not a PRD §10 entity). Do not build upload UI, mutations or storage now. |
| Future path (post-MVP) | **Vercel Blob** (native to the Vercel host, signed URLs, size/content-type limits) or **Cloudflare R2** with signed URLs; decided at that time. |

### Alternatives considered & rejected

S3/R2 object storage for avatars considered; deferred. When real uploads arrive post-MVP, Vercel Blob is the natural fit for the chosen Vercel host.

### Consequences / trade-offs

- **+** Zero object-store cost, tokens and IAM in the MVP.
- **+** Avatar via validated URL is enough for FR-1; works offline/anonymous in dev.
- **—** URL-only avatars require **validating/allow-listing remote hosts** to avoid SSRF/privacy leaks when rendered.
- **—** Real avatar/attachment uploads are a post-MVP cut — a deliberate scope decision, not an omission.

---

## Decision 5 — Viewer-Role Staging

**Status:** ✅ Accepted (2026-08-02) — decision recorded here per Task 0003.

### Context

PRD §14 open decision #4 asks whether **Viewer** access ships in the first release or waits until after Editor collaboration works. Story 02's permission tests depend on whatever is chosen, so the answer must be recorded here rather than left open.

### Decision

**Defer the Viewer role to after Editor collaboration works.** The MVP permission matrix ships **Owner** and **Editor** only. Viewer is explicitly out of scope for the first release; the role matrix (Task 0204) is built so a read-only role can be added later without reworking the permission model.

### Rationale

Editor collaboration (invite, membership, task/section/label editing) is the core value of the Shared MVP. Adding a distinct read-only Viewer role now multiplies permission-matrix surface and test scope before the collaborative loop is proven, with no MVP requirement.

### Consequences / trade-offs

- **+** Smaller permission matrix and test surface for Story 02; faster path to a working shared-work loop.
- **+** Role model is designed to be extended, so adding Viewer later is additive.
- **—** Read-only members are not possible in the first release; the eventual Viewer role must be covered by Task 0204 tests when added.

---

## Security Ownership

**Owner:** Project maintainer (sole developer of the Shared MVP).

- **Threat review:** Before each milestone, the maintainer reviews the threat surface for auth/authorisation: session handling, `authProviderId` mapping, Server Action authorisation, invite token issuance/reuse (first-accept-wins, hashed-at-rest), avatar-URL allow-listing (SSRF), and role-matrix enforcement.
- **Dependency patching:** Keep the auth stack (`better-auth`, `@better-auth/drizzle`) and runtime dependencies patched. Tracked as part of release hardening (Story 05, Task 0504) and on advisory notifications.
- **Incident response for auth/authorisation:** The maintainer owns triage, revocation (real-time via database-backed sessions) and communication. Secrets are never in the repo; secrets live in Vercel env vars / secret manager and are rotated on any suspected exposure.
- **Secrets referenced:** `DATABASE_URL` (+ pooled URL), `RESEND_API_KEY`, `FROM_EMAIL`, auth-provider OAuth credentials/callback URLs — all by env-var name only.

## Runbook Ownership

**Owner:** Project maintainer (sole deployer/operator of the Shared MVP).

- **Migrations:** Run by the maintainer via versioned `drizzle-kit` files in a release/CI step; migrations always go forward, never direct schema edits.
- **Backups:** Automatic daily PITR backups on Neon with 7-day retention (Decision 1); verified on a schedule.
- **Restores:** Performed by the maintainer via the provider's PITR console/API, in an incident, per Decision 1.
- **Deployments:** Managed by the maintainer to Vercel (production + preview from branch deployments); commits to `main` deploy production.
- The maintainer is the single accountable person for all of the above; any transfer of these duties must be recorded here.

---

## Deferred (explicitly not decided here)

- **Inbox/private task privacy** (PRD §14 #5): Pending product decision; PRD assumption stands — Inbox tasks are private until moved to a shared project.
- **Product name, domain, privacy/terms copy** (PRD §14 #6): Branding/product decision, revisit pre-release; out of ADR scope.
- **Attachments / real avatar uploads** (Decision 4): Post-MVP; revisit Vercel Blob or Cloudflare R2.
- **Microsoft Entra ID and email+password sign-in** (Decision 2): Built into BetterAuth; enable later with no provider switch.

## Secret Management

No secrets are stored in this repository or in this file. Only environment-variable **names** are referenced. Actual values live in:

- **Vercel** environment variables / secret manager for `DATABASE_URL` (and pooled URL), `RESEND_API_KEY`, `FROM_EMAIL`, and OAuth credentials/callback URLs.
- Local development via an untracked `.env.local` / `.env` (git-ignored), mirroring the same variable names.

## Cross-references

- Source of truth per decision: [`context/Stories/00-technical-decisions.md`](./context/Stories/00-technical-decisions.md)
- Tasks: [`0000`](./context/Stories/Task/0000-decision-host-and-database.md), [`0001`](./context/Stories/Task/0001-decision-auth-provider.md), [`0002`](./context/Stories/Task/0002-decision-email-and-storage.md), [`0003`](./context/Stories/Task/0003-write-architecture-decision-record.md)
- Story 01 (foundation, builds on these decisions): [`context/Stories/01-foundation.md`](./context/Stories/01-foundation.md)
- PRD open decisions: [`context/product-requirements-document.md`](./context/product-requirements-document.md) §14
