# Story 00 — Technical Decisions

**Milestone:** M0 — Technical decisions
**Depends on:** Product confirmation
**Goal:** Lock in the auth, database, deployment, email-invite, storage and security-ownership decisions so implementation can begin with confidence.

## Context

The PRD deliberately leaves these decisions open (§14) because they affect cost, external accounts and long-term architecture. This Story resolves them before any code in Story 01.

## In scope

- Authentication provider and sign-in methods.
- Database and hosting provider, including backups/retention.
- Email delivery provider and invitation expiry/resent policy.
- Storage approach (avatars, attachments deferred).
- Documented security ownership and runbook ownership.

## Out of scope

- Implementation of the flows (Story 01+).
- Viewer-role staging decision (tracked as an open question).

## Acceptance

A single `DECISIONS.md` (or equivalent) records each choice, the alternatives rejected, and the explicit rationale. Every subsequent Story references these decisions without re-litigating them.

## Decision 1 — Hosting, Database, ORM, Migrations & Backup/Retention

**Status:** Decided (2026-08-02). Resolves PRD §14 open decision #2 and the Story 00 "Database and hosting provider, including backups/retention" scope item. This is the single source of truth; subsequent Stories reference it without re-litigating.

### Decided

| Concern | Decision |
|---|---|
| Hosting | **Vercel** (Next.js-native, managed serverless runtime) — no VM/container to patch; Server Actions and server components run natively in-region. |
| Database | **Neon** — managed serverless **PostgreSQL**. Full relational integrity and native `timestamptz`. |
| ORM / data access | **Drizzle ORM** (TS-first, lightweight, `drizzle-kit` migrations). |
| Migrations | `drizzle-kit` applied in a release/CI step; database **branching** for development and preview environments. |
| Production storage of time | All timestamps stored as **`timestamptz` in UTC** (PRD §11 Time handling); render in the user's browser timezone. |
| Backups & retention | **Automatic daily backups with point-in-time recovery (PITR)**; default retention **7 days** (extendable on the provider's paid tier). |
| Restore ownership | The **runbook owner / project maintainer** (documented in `DECISIONS.md`, Task 0003) performs restores using the provider's PITR console/API; migrations always go forward via versioned files, never by direct schema edits. |

### Context

The PRD data model (§10) needs a relational store: many-to-many `TaskLabel` join, self-referential sub-tasks (`Task.parentTaskId` with the "parent/child share project" invariant), `ProjectMembership` uniques, soft-deleted `Comment`, and append-only `ActivityEvent`. The NFRs require atomic persistence (e.g. `Project` + owner `ProjectMembership` in one transaction), recoverable errors, and UTC time handling — all of which PostgreSQL satisfies natively. The app is Next.js 16 server components/actions (per `package.json`), so an ORM that runs cleanly inside Server Actions and server-rendered queries is required, and hosting should be managed to hit the <2.5s authenticated project view.

### Alternatives considered & rejected

| Option | Rejected because |
|---|---|
| SQLite / libSQL in production | Not relational/lock-safe enough for concurrent multi-member projects; must mirror `timestamptz` as text timestamps. Allowed only as a **local dev mirror** with the dialect caveat documented below. |
| PlanetScale | MySQL-base, requires modifying `timestamptz`-style semantics; less natural fit for the specified Postgres-style constraints, and serverless driver adds indirection. |
| Supabase (as database host) | Viable Postgres alternative; rejected as the primary because its value-add (auth, storage) belongs to the auth/storage decisions (Tasks 0001–0002) and we want the app-layer auth (BetterAuth) isolated from the DB. Retained as a fallback alternative. |
| Fly.io / Railway / Render (containers) | Viable but require managing VMs/containers, patching the OS, and running the DB yourself; slower to reach the 2.5s NFR with no reliability benefit for this app. Retained as alternative. |
| Prisma | Heavier client/schema pipeline; Drizzle chosen for type-safety with lighter generated code and simpler migration workflow. |

### Primary vs alternative

- **Primary:** Vercel + Neon Postgres + Drizzle ORM + `drizzle-kit`.
- **Alternative:** Railway (or Supabase platform) + managed Postgres + Drizzle ORM; if a fully self-contained local setup is ever needed, SQLite mirrors the schema but the `timestamptz`-vs-text-timestamp dialect differences must be handled carefully in migrations.

### Consequences / trade-offs

- **+** Managed Postgres gives atomic transactions, FKs, and PITR backups for free; Drizzle keeps the data-access layer small and type-safe inside Server Actions.
- **+** `timestamptz` matches the UTC-storage NFR directly; timezone rendering stays a presentation concern.
- **—** Neon is a serverless DB with connection pooling; connection limits and cold-start latency must be monitored to keep the <2.5s view (mitigate with pooled connections and bounded query pages).
- **—** Hosting and DB are separate providers (Vercel + Neon), so secrets (connection strings) live in Vercel environment variables / secret-manager, never in the repo. The `DATABASE_URL` and pooled URL are referenced by name only.
- **—** Vercel serverless cold starts + Neon cold pool can occasionally exceed the 2.5s budget on first hit; mitigated with region co-location and pooled, warm connections.

## Decision 2 — Authentication Provider, Sign-in Methods & Session Strategy

**Status:** Decided (2026-08-02). Resolves PRD §14 open decision #1 and the Story 00 "Authentication provider and sign-in methods" scope item; drives FR-1 and the invitation-acceptance flow in FR-2.

### Decided

| Concern | Decision |
|---|---|
| Provider | **BetterAuth** — open-source (MIT), code-first, TypeScript-first auth library — self-hosted on the app's Vercel runtime; keeps auth in the app layer, isolated from the DB (consistent with Decision 1's stance). |
| Adapter / persistence | **Drizzle adapter** (`@better-auth/drizzle`) against Neon Postgres — persists the library's `user`, `session`, `account` and `verification` tables for OAuth linking, magic-link flows and sessions. |
| Sign-in methods | **Email magic link (passwordless)** — primary — plus **Google OAuth** for convenience; **Microsoft Entra ID** and **email+password** deferred/optional (both are built into the library, so they can be enabled later without a provider switch). |
| Identity via verified email | Every chosen method yields a **verified email address**, which is what makes the FR-2 invite flow possible and keeps the `User` key stable. |
| `User.authProviderId` mapping | OAuth → the social provider's stable external account id; email magic link → the **verified email address**. The internal PRD `User` row is keyed by this value (FR-1, Task 0100). |
| Internal user record | The library's core `user` record (id, email, name, image, emailVerified) is extended to the PRD `User` entity (displayName, avatar, timestamps); created on first authenticated entry and updated on later sign-ins inside the data-access layer (Task 0102). |
| Session strategy | **Database-backed sessions** (the library's recommended default) — real-time revocation and simple server-side invalidation; a single indexed session lookup on pooled Neon stays well within the <2.5s view NFR. |
| Server-side auth | The BetterAuth server helper (`auth.api.getSession({ headers })`) is used in **Server Components and every Server Action** to authorise the actor and to read the verified session email/id (FR-1 authorization). |
| Unauthenticated redirect | BetterAuth's Next.js middleware helper (`getSessionCookie`) plus guarded layout/route reads redirect visitors to `/sign-in`; protected data is only rendered after auth and never shipped in the unauth response or client bundle (FR-1). |

### Context

The app is Next.js 16 App Router / React 19 with Server Components and Server Actions, self-hosted on Vercel with Neon Postgres and Drizzle (Decision 1), and the product requires email identity for invitations (FR-2: an invitee must authenticate with the invited email to accept). BetterAuth is a code-first, MIT-licensed, TypeScript-first auth library designed around the App Router: its server helper runs in Server Actions and server-rendered queries, its dedicated Drizzle adapter fits the existing schema/migration workflow, and both magic-link and OAuth providers return a **verified email** that maps cleanly onto the internal `User.authProviderId` and onto `Invitation.email` matching. Database-backed sessions give real-time revocation while a single indexed, pooled lookup keeps the authenticated view inside the <2.5s NFR. The invitation flow works regardless of session storage because email matching is done against the session's verified email.

### Alternatives considered & rejected

| Option | Rejected because |
|---|---|
| Auth.js (NextAuth) v5 | Mature, battle-tested option with first-class App Router/Server Action support; **rejected as primary** only because BetterAuth offers sharper code-first DX, first-class magic-link and database-session support, and a cleaner fit with the Drizzle self-hosted stack. **Retained as the primary fallback.** |
| Clerk | Hosted sign-in screens and multi-method auth out of the box, but adds a paid per-MAU third-party, external dependency and lock-in that is unnecessary on an already self-hosted stack; would move identity ownership out of the app layer. |
| Supabase Auth | Couples auth to the database provider rejected as primary in Decision 1; its value-add belongs to this auth decision, and we want app-layer auth isolated from the DB. Retained only as a fallback if self-hosted auth ever fails. |
| Lucia | The library was **deprecated/archived by its maintainer (2025)** and is no longer actively developed; too high a maintenance/security risk for a Long-term project. |
| Custom session implementation | Full control, but a large security surface (session issuance/rotation, CSRF, password hashing/reset, revocation) best delegated to a maintained, widely-audited framework integration. |

### Primary vs alternative

- **Primary:** BetterAuth (magic link + Google) with the Drizzle adapter, database-backed sessions, and the server helper used in Server Actions.
- **Alternative:** Auth.js v5 if BetterAuth proves too immature for our needs (more battle-tested, minimal behavioural change); Clerk if a fully hosted sign-in/multi-method solution is later preferred without building/maintaining it.

### Consequences / trade-offs

- **+** Free, self-hosted, MIT, code-first, with a strong developer experience; matches Task 0001's recommendation and Decision 1's app-layer-auth stance.
- **+** Verified email from magic link/OAuth directly supports the FR-2 invite acceptance flow and a stable `authProviderId`.
- **+** Database-backed sessions give **real-time revocation** (stronger than a stateless JWT), with a single indexed, pooled lookup that stays inside the <2.5s NFR; JWT mode is the documented fallback if session lookups ever show up hot.
- **+** Microsoft and email+password are built into the library, so adding them later needs no provider change.
- **—** BetterAuth is younger and less battle-tested than Auth.js v5; adopted while no code depends on it (Story 00), so a switch stays cheap — ratified when Story 01 Task 0100 is implemented.
- **—** Database-session mode adds a per-request session read (mitigated by a single indexed query + pooled connection; JWT-mode fallback noted above).
- **—** Magic link requires **email delivery** (see Decision 3 / Task 0002).
- **—** Auth flows add library-owned schema tables (`user`, `session`, `account`, `verification`) to migrate; tracked in Task 0101.

## Decision 3 — Email Delivery Provider, Invitation Expiry/Resend Policy & Token Security

**Status:** Decided (2026-08-02). Resolves PRD §14 open decision #3 and the Story 00 "Email delivery provider and invitation expiry/resent policy" scope item; drives FR-2 and the invitation-acceptance flow in Task 0203.

### Decided

| Concern | Decision |
|---|---|
| Email provider | **Resend** — transactional API + webhooks; first-class React templates (`react-email`); free tier (100 emails/day) covers dev + early MVP. One provider serves **both** BetterAuth magic links (Decision 2) and project invitations. |
| Templates | In-repo `emails/` `react-email` templates rendered server-side and sent via the Resend API. |
| Invitation token security | Fresh high-entropy token per invite (`crypto`, ≥256 bits); DB stores **only `tokenHash` (SHA-256) + `status`** — the raw token exists only inside the emailed accept link, never persisted (PRD §10). |
| Expiry | **7 days** from the latest invite; `expiresAt` stored `timestamptz` in UTC. |
| Status enum | `pending \| accepted \| declined \| expired \| revoked`. |
| Expiry enforcement | Server-side only — rejected lazily on read/accept (`now > expiresAt`) **and** a scheduled sweep flipping `pending` → `expired`. |
| Acceptance | **First-accept-wins**, token single-use: one transaction verifies `pending` + unexpired, marks `accepted`, creates the active `ProjectMembership`, and **revokes all other `pending` invites for that project+email**. Reuse of any consumed/expired/revoked/declined token is rejected. |
| Resend policy | While `pending` and unexpired, a member with invite permission may **resend**: **rotates the token** (new hash) and **resets expiry to +7 days**, invalidating the old link. Expired invites are **never revived** — re-inviting creates a fresh row (UI offers "resend expired"). |
| Secrets | `RESEND_API_KEY` and `FROM_EMAIL` referenced by env-var name only; never stored in the repo. |

### Context

FR-2 requires invitees to authenticate with the invited email, and PRD §10 forbids persisting a reusable raw token (`Invitation.tokenHash`). The BetterAuth magic-link email (Decision 2) and the project-invitation email (FR-2) can share a single transactional provider. Resend is chosen over SendGrid/Postmark because of its simple REST API + webhooks for delivery visibility, first-class Next.js/React templating, and a generous dev-tier allowance — keeping MVP cost at ~$0 while staying production-ready.

### Consequences / trade-offs

- **+** One email provider and one secret for both magic links and invites; webhooks give delivery observability.
- **+** Single-use, SHA-256-hashed tokens satisfy the §10 security and Privacy NFRs — no raw token at rest, first-accept-wins prevents token reuse.
- **+** No object-store cost or ops in the MVP.
- **—** MVP depends on email deliverability for both sign-in and invites; webhooks + scheduled status sweep mitigate, but degraded delivery shows up as slow acceptance.
- **—** Lazy + scheduled expiry means an invite is only marked `expired` once checked or swept — acceptable because acceptance always re-checks `expiresAt`.
- **—** Free tier caps daily sends; adequate for MVP but must be upgraded before meaningful load.

## Decision 4 — Object Storage, Avatars & Deferred Attachments

**Status:** Decided (2026-08-02). Resolves the Story 00 "Storage approach (avatars, attachments deferred)" scope item.

### Decided

| Concern | Decision |
|---|---|
| Avatar storage | **Defer standalone object storage** for the MVP. `User.avatarUrl` (PRD §10) holds a **validated absolute URL** — auth-provider profile image or user-supplied URL. No file upload, no S3/R2 in the MVP. |
| Attachments | **Out of MVP scope** (not a PRD §10 entity). Do not build upload UI, mutations or storage now. |
| Future path (post-MVP) | **Vercel Blob** (native to the Vercel host, signed URLs, size/content-type limits) or **Cloudflare R2** with signed URLs; decided at that time. |

### Context

PRD §10 `User` only includes `avatarUrl` and FR-1 lists the avatar as "optional"; attachments are not modelled at all. Standing up an object store early adds cost and ops with no MVP requirement, so a provider-supplied or user-supplied URL satisfies the MVP. When real uploads arrive post-MVP, Vercel Blob is the natural fit for the chosen Vercel host.

### Consequences / trade-offs

- **+** Zero object-store cost, tokens and IAM in the MVP.
- **+** Avatar via validated URL is enough for FR-1 ("avatar optional"); works offline/anonymous in dev.
- **—** URL-only avatars require validating/allow-listing remote hosts to avoid SSRF/privacy leaks when rendered.
- **—** Real avatar/attachment uploads are a post-MVP cut — a deliberate scope decision, not an omission.

## Corresponding tasks

- [`./Task/0000-decision-host-and-database.md`](./Task/0000-decision-host-and-database.md)
- [`./Task/0001-decision-auth-provider.md`](./Task/0001-decision-auth-provider.md)
- [`./Task/0002-decision-email-and-storage.md`](./Task/0002-decision-email-and-storage.md)
- [`./Task/0003-write-architecture-decision-record.md`](./Task/0003-write-architecture-decision-record.md)
