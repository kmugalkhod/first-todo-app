# Task 0000 — Decide Host + Database

**Status:** ✅ Done (2026-08-02). Choice recorded in [`../00-technical-decisions.md`](../00-technical-decisions.md) → "Decision 1 — Hosting, Database, ORM, Migrations & Backup/Retention".

## Requirement

Choose and record the hosting provider, database technology, and backup/retention strategy for the Shared MVP. The decision must satisfy the PRD's performance (<2.5s authenticated project view), reliability (atomic persistence, recoverable errors) and time-handling (UTC storage) non-functional requirements.

## Steps

1. List candidate hosting providers (e.g. Vercel, Railway, Fly.io, managed providers) and evaluate support for the chosen runtime (Next.js).
2. List candidate databases (e.g. PostgreSQL, SQLite/LibSQL, PlanetScale, Supabase) and evaluate relational needs — the PRD data model (§10) has many-to-many (`TaskLabel`), self-referential sub-tasks and soft-deleted comments, so a relational store is strongly preferred.
3. Evaluate each candidate against: cost, server-action compatibility, migration tooling, hosted backups, timezone-correct `timestamptz` support, and privacy/retention requirements.
4. Select a primary choice and at least one viable alternative.
5. Define the backup frequency and retention window, and who owns restoring in an incident.
6. Record the decision in `DECISIONS.md` (produced in Task 0003).

## Recommendation

Prefer **PostgreSQL** (or a Postgres-compatible hosted service). It natively supports `timestamptz`, foreign-key integrity for the membership/label/task relationships, and reliable migrations. The app already runs Next.js server components/actions, so server-rendered data access works cleanly with an ORM such as **Drizzle ORM** or **Prisma**. If a fully self-contained local setup is preferred for development, SQLite can mirror the schema, but plan the dialect differences (e.g. `timestamptz` vs text timestamps) carefully before writing migrations. Document the choice — do not leave it as an undocumented assumption.

## Resolution (2026-08-02)

**Host:** Vercel (Next.js-native, managed serverless).
**Database:** Neon — managed serverless **PostgreSQL**.
**ORM / migrations:** **Drizzle ORM** with `drizzle-kit`; database branching for dev/preview.
**Time:** all timestamps stored `timestamptz` in UTC; rendered in the user's browser timezone.
**Backups / retention:** automatic daily backups with **point-in-time recovery**, default retention **7 days**; restore owned by the runbook owner (maintainer), performed via the provider's PITR console/API.

**Alternatives (viable):** Railway / Supabase platform with managed Postgres + Drizzle; SQLite only as a local dev mirror (mind dialect differences).
**Rejected:** Fly.io/containers (self-managed), PlanetScale, SQLite in production, Prisma (heavier than Drizzle).

This decision is the single source of truth recorded in `../00-technical-decisions.md`. Task 0003 will consolidate it, plus the auth (0001) and email/storage (0002) decisions, into the root `DECISIONS.md` ADR. No secrets/connection strings are stored in these files — only environment-variable names (`DATABASE_URL`, pooled URL).
