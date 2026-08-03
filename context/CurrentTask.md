# CurrentTask.md — Session Driver

This file is the single entry point the agent reads **first** to know what to work on. It tells the LLM the exact task to execute, which project files to honour, and where to record the result when the task is done.

> **Workflow:** The human (or a parent agent) writes a task file path into `Task File Path` below → the LLM reads this file, reads the task, implements it → on completion the LLM marks `Status` as done, appends a row to `History`, and **moves that task's `.md` file** out of `context/Stories/Task/` into `context/Stories/Completed-Task/`. The task file content itself is never edited here.

---

## 1. Instructions for the LLM

1. Read **this** file first.
2. Read the required context files (Section 3) **before** writing/editing any code — especially any UI work.
3. Read the task file given in `Task File Path` (Section 2) and implement it fully against its *Requirement*, *Steps* and *Recommendation*.
4. Follow `AGENTS.md` (mode rules, design conformance, story/task discipline).
5. When the task is complete, validate it, then update the `History` table (Section 4) and set `Status` to `Done`. Do **not** modify the content of the referenced task file.
6. **Move the completed task file** from `context/Stories/Task/` into `context/Stories/Completed-Task/` (keep its filename unchanged). If the task was not fully completed, leave it in `Task/`.
7. If blocked, leave `Status` = `Blocked` and add a note in `History`.
8. **After a task is completed** (validated, `History` updated, task file moved), **create a well-named feature branch off `main`, commit all changes there, and push it to GitHub.** Use a descriptive branch name based on the task, e.g. `feat/0103-add-server-action-boundary`. Push the branch with `git push -u origin <branch>`. Do **not** push directly to `main`.

---

## 2. Current Task

| Field | Value |
|-------|-------|
| **Task File Path** | `context/Stories/Task/0104-build-authenticated-shell-and-routing.md` |
| **Task Title** | Build Authenticated Shell + Routing |
| **Status** | `Done` |
| **Started** | 2026-08-03 |
| **Completed** | 2026-08-03 |

> Set `Task File Path` to the `.md` task you want worked on. The agent will read it from there and implement it.

---

## 3. Required Context Files (the LLM must read these)

| Purpose | Path |
|---------|------|
| **Agent rules / project conventions** | `AGENTS.md` |
| **Design system (canonical)** | `DESIGN.md` |
| **Design — golden reference** | `context/Final-design/taskspace-momentum-prototype.html` |
| **Design — machine-readable tokens** | `.impeccable/design.json` |
| **Product requirements** | `context/product-requirements-document.md` |
| **Stories index / task order** | `context/Stories/Task/README.md` |

> For **any UI work** the design files above are **mandatory** and enforced by the design-review hook. Always read them before editing styles/components/markup.

---

## 4. History

Log every completed task here so the current state is visible at a glance. One row per task, newest on top.

| Date | Task File | Title | Status | Notes |
|------|-----------|-------|--------|-------|
| 2026-08-03 | `context/Stories/Task/0104-build-authenticated-shell-and-routing.md` | Build Authenticated Shell + Routing | `Done` | Signed-in application shell per DESIGN.md: route groups (`(app)` protected, `(public)` public), layout guards on both groups (unauthenticated `(app)` visitors redirect to `/sign-in`; signed-in `(public)` visitors redirect to `/`). Shell lives in `app/(app)/layout.tsx` (cobalt sidebar + action topbar + paper `SidebarInset`) so it persists across protected pages. `AppSidebar` restyled to Taskspace tokens — cobalt field, white brand, translucent-white hover/active, citron circular plus on the translate create button — with nav (All tasks/Inbox/Upcoming/Completed), Projects empty-state, People and a profile card (avatar/initials, display name, email) with a Sign out dropdown via Base UI. Hooked up `public/archivo-display.ttf` via `next/font/local` as `--font-archivo`/`font-heading` and applied the display face to the brand + landing heading; sidebar `--sidebar*` tokens set to cobalt/citron/coral. `app/sign-in` moved into `(public)`. Typecheck clean; lint only shows pre-existing `toggle.tsx`/`use-mobile.ts` errors; dev server boots, `/` 307-redirects unauthenticated visitors and `/sign-in` returns 200. |
| 2026-08-03 | `context/Stories/Task/0103-add-server-action-boundary.md` | Add Server-Action Boundary | `Done` | Server-action boundary under `lib/server-actions/`. Client-safe shared result types in `types.ts` (`ActionResult<T> = { ok, data } | { ok: false, error: { code, message? } }`); every action returns a typed serialisable result and never throws opaque errors across the boundary. Thin actions over domains (`projects`, `memberships`, `sections`, `tasks`, `labels`, `comments`) each: resolve the actor from the session via `requireActor()` (never trusts client-sent userId/role), delegate to the Task 0102 DAO (which re-resolves the resource from the DB and re-checks membership/role), and normalise any `AppError` to a stable code (`UNAUTHORIZED`/`FORBIDDEN`/`NOT_FOUND`/`VALIDATION`/`CONFLICT`/`UNKNOWN`). `moveTask` maps to `updateTask`. The boundary keeps DB/auth code under server-only imports (`import "server-only"`); client code can only ever import the client-safe types. Typecheck + eslint clean. Invitations/`inviteMember` intentionally deferred to Story 02 (no DAO yet). |
| 2026-08-03 | `context/Stories/Task/0102-build-data-access-layer.md` | Build Data-Access Layer | `Done` | Central data-access layer under `lib/data-access/`: every function takes the authenticated `Actor` first and enforces membership/role before touching data (PRD §7/§11). Role/permission matrix + reusable checks in `access.ts` (`assertPermission`, `assertProjectAccess`, `assertActiveMember`); typed DTOs strip sensitive fields (`users` never exposes `authProviderId`); DAO modules for `users`, `projects`, `memberships`, `sections`, `tasks`, `labels`, `comments`, `activity`. Multi-record writes atomic via new `dbWrite` (Neon WebSocket Pool) + `transaction.ts` (`createProject` + owner membership, `transferOwnership`, `setTaskLabels`). Reads return `null`/`empty` for non-members (no partial rows). Typecheck + eslint clean. Inbox/ project-less tasks deferred to Task 0400. |
| 2026-08-03 | `context/Stories/Task/0101-create-database-schema-and-migrations.md` | Create Database Schema + Migrations | `Done` | Full PRD §10 data model in Drizzle/Postgres: `Project`, `ProjectMembership`, `Section`, `Task` (self-ref sub-tasks), `Label`/`TaskLabel`, `Comment` (soft delete), `ActivityEvent` (jsonb metadata), `Invitation` (`token_hash` only); added `users.avatar_url`. UTC `timestamptz` everywhere; unique natural keys + query indexes. Cross-table integrity (task section/parent same project, assignee must be active member, task-label project scope, completion check) enforced via triggers/check appended to `drizzle/0001_mixed_hedge_knight.sql`. Verified against dev Neon DB — migration applied and triggers exercised. |
| 2026-08-03 | `context/Stories/Task/0100-setup-auth-and-user-sync.md` | Setup Auth + User Sync | `Done` | BetterAuth (magic-link + optional Google) with Drizzle/Postgres; `getCurrentUser()` syncs internal `User` via atomic upsert; protected `(app)` route group + `/sign-in`; Drizzle migration generated. Requires real `DATABASE_URL`/`BETTER_AUTH_SECRET`/`RESEND_API_KEY` before `pnpm dev` (see `.env.example`). |

> When you finish a task, **append a new row** here with `Status = Done` (or `Blocked` with a note) and update `Status` in Section 2. Never overwrite prior rows.
