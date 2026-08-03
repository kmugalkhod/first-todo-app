# CurrentTask.md — Session Driver

This file is the single entry point the agent reads **first** to know what to work on. It tells the LLM the exact task to execute, which project files to honour, and where to record the result when the task is done.

> **Workflow:** The human (or a parent agent) writes a task file path into `Task File Path` below → the LLM reads this file, reads the task, implements it → on completion the LLM marks `Status` as done and appends a row to `History`. The task file itself is never edited here.

---

## 1. Instructions for the LLM

1. Read **this** file first.
2. Read the required context files (Section 3) **before** writing/editing any code — especially any UI work.
3. Read the task file given in `Task File Path` (Section 2) and implement it fully against its *Requirement*, *Steps* and *Recommendation*.
4. Follow `AGENTS.md` (mode rules, design conformance, story/task discipline).
5. When the task is complete, validate it, then update the `History` table (Section 4) and set `Status` to `Done`. Do **not** modify the referenced task file.
6. If blocked, leave `Status` = `Blocked` and add a note in `History`.

---

## 2. Current Task

| Field | Value |
|-------|-------|
| **Task File Path** | `/Users/kunal007/projects/first-todo-app/context/Stories/Task/0100-setup-auth-and-user-sync.md` |
| **Task Title** | Setup Auth + User Sync |
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
| 2026-08-03 | `context/Stories/Task/0100-setup-auth-and-user-sync.md` | Setup Auth + User Sync | `Done` | BetterAuth (magic-link + optional Google) with Drizzle/Postgres; `getCurrentUser()` syncs internal `User` via atomic upsert; protected `(app)` route group + `/sign-in`; Drizzle migration generated. Requires real `DATABASE_URL`/`BETTER_AUTH_SECRET`/`RESEND_API_KEY` before `pnpm dev` (see `.env.example`). |

> When you finish a task, **append a new row** here with `Status = Done` (or `Blocked` with a note) and update `Status` in Section 2. Never overwrite prior rows.
