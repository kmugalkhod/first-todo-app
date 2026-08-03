# Story 01 — Foundation

**Milestone:** M1 — Foundation
**Depends on:** Story 00
**Goal:** Deliver an authenticated application shell with user synchronisation, database migrations, a data-access layer and server-side role checks.

## Context

The current app is a local-only demo (`app/page.tsx`) with no identity, persistence or server actions. This Story replaces that with a protected app: users must sign in before seeing any product data, and the internal user record is created/updated on first authenticated entry (PRD FR-1).

## In scope

- Sign up / sign in / sign out and a minimal profile (display name, avatar optional).
- Protected routing — authenticated-only access to product data.
- Database schema + migrations for all entities (PRD §10).
- Data-access layer that centralises membership/role checks.
- Server-side action boundary for all mutations.

## Out of scope

- Project/task features (Story 02/03).
- Emails and invitations (Story 02).

## Acceptance

- Unauthenticated visitors are redirected to sign in; no protected data is in the response or client bundle (FR-1).
- First authenticated sign-in creates an internal user record; subsequent sign-ins update it.
- Migrations apply cleanly from scratch and are versioned.
- Every data access goes through the role-checked data-access layer.

## Corresponding tasks

- [`./Task/0100-setup-auth-and-user-sync.md`](./Task/0100-setup-auth-and-user-sync.md)
- [`./Task/0101-create-database-schema-and-migrations.md`](./Task/0101-create-database-schema-and-migrations.md)
- [`./Task/0102-build-data-access-layer.md`](./Task/0102-build-data-access-layer.md)
- [`./Task/0103-add-server-action-boundary.md`](./Task/0103-add-server-action-boundary.md)
- [`./Task/0104-build-authenticated-shell-and-routing.md`](./Task/0104-build-authenticated-shell-and-routing.md)
