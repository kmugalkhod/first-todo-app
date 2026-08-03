# Task 0001 — Decide Auth Provider

**Status:** ✅ Done (2026-08-02). Choice recorded in [`../00-technical-decisions.md`](../00-technical-decisions.md) → "Decision 2 — Authentication Provider, Sign-in Methods & Session Strategy".

## Requirement

Choose and record the authentication provider and sign-in methods (email/password, magic link, Google, Microsoft, etc.) and how the internal `User` record is linked to the authenticated identity (PRD §14 open decision #1; FR-1).

## Steps

1. List candidate providers (Auth.js / NextAuth, Clerk, Supabase Auth, Lucia, custom session) and the sign-in methods each supports.
2. Evaluate against: cost, sign-in method coverage, Next.js 16 / React 19 compatibility, session handling with Server Actions, and the ability to retrieve a stable external identity id for the `User.authProviderId` field.
3. Decide the invited-by-email flow implications: the provider must let you match an authenticated session back to the invite email (FR-2).
4. Decide session strategy (cookie-based JWT vs database session) and expiry/renewal behaviour.
5. Decide how unauthenticated visitors are redirected to sign in without leaking protected data (FR-1).
6. Record the decision.

## Recommendation

Choose an auth solution that is actively maintained for Next.js App Router and Server Actions and that lets you map the session to a stable provider id. **BetterAuth** — an open-source, code-first, TypeScript-first library — is a strong fit given the existing self-hosted Next.js + Drizzle stack; **Auth.js (NextAuth) v5** is the mature fallback, and **Clerk** is a good alternative if you want hosted sign-in screens and multi-method auth without building them. Ensure the solution supports a **server-side session helper** usable inside server actions so every mutation can authorise the actor. Also decide how an invitee signing in with the invited email is recognised — this is required before Story 02's acceptance flow.

## Resolution (2026-08-02)

**Provider:** **BetterAuth** — open-source (MIT), code-first, TypeScript-first — self-hosted on Vercel; **Drizzle adapter** (`@better-auth/drizzle`) against Neon Postgres keeps auth in the app layer, isolated from the DB.

**Sign-in methods:** **Email magic link (passwordless)** — primary — plus **Google OAuth** for convenience; **Microsoft Entra ID** and **email+password** deferred/optional (built into the library, so they can be enabled later without a provider switch).

**`User.authProviderId` mapping:** OAuth → the social provider's stable external account id; email magic link → the **verified email address**. The internal PRD `User` row is keyed by this value and created/updated on each authenticated entry (FR-1).

**Session strategy:** **Database-backed sessions** (BetterAuth's recommended default) — real-time revocation; a single indexed session lookup on pooled Neon stays inside the <2.5s NFR. Stateless JWT mode is the documented fallback if session lookups ever show up hot.

**FR-2 invited-by-email matching:** every chosen method yields a **verified email**, so the accept flow matches the session's verified email against the `Invitation.email` before activating membership — this drives Story 02's acceptance flow.

**Alternatives (viable):** Auth.js (NextAuth) v5 (mature, battle-tested fallback if BetterAuth proves immature for our needs); Clerk (hosted multi-method sign-in if fully-hosted UI is later preferred).
**Rejected:** Supabase Auth (couples auth to the rejected DB provider), Lucia (deprecated/archived by maintainer, 2025), custom sessions (large security surface).

This decision is the single source of truth recorded in `../00-technical-decisions.md`. Task 0003 will consolidate it with the Decision 1 (host + database) and Decision 3 (email + storage) choices into the root `DECISIONS.md` ADR. No secrets/callback URLs are stored in these files — environment-variable names only.
