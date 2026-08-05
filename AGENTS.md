<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:design-conformance -->
# Design Conformance (MANDATORY for all UI work)

The product has an approved visual design. Every UI you write MUST conform to it. This is enforced — a design-review hook runs on every edit and flags deviations.

## Read before you write any UI

Before writing or editing ANY styles, components, or markup, read BOTH of these and implement from them:

1. `context/Final-design/taskspace-momentum-prototype.html` — the golden reference for how screens look and lay out (guard against drift by comparing your result to it).
2. `DESIGN.md` — the canonical design system (colors, type, spacing, radii, components). The machine-readable twin is `.impeccable/design.json`.

## The four hard rules (never break these)

1. **Signal colors are semantic, not decoration.** Cobalt (`#3543d6`) = navigation/primary/advancement. Citron (`#edff81`) = people & ownership. Coral (`#ff765d`) = attention/overdue. Green (`#3b8b69`) = completion only (completed subtasks). Do NOT use citron/coral/green as interchangeable accents.
2. **Big name, small system.** ArchivoDisplay is for project/page titles only. All body, metadata, controls and copy use the Aptos system face. Never use the display face for dense text.
3. **Coexisting context.** On wide screens keep the task list AND the selected detail record side by side — never replace the record with a full-screen detour/modal while both can coexist. Mobile converts the record to a fixed bottom sheet with the list retained.
4. **Flat-until-floating.** Ordinary rows/sections/controls use borders + pale surfaces, not elevation/cards. Reserve shadows for the shell, dialogs, toasts and the mobile sheet.

## Using design tokens (no hard-coded values)

- Use the Taskspace tokens (from `DESIGN.md` / `.impeccable/design.json`). Do NOT hard-code off-palette hex colors, off-scale radii, font sizes, or non-system fonts — the design hook flags these as `design-system-*` findings.
- If a token does not yet exist in the codebase (`app/globals.css` / Tailwind theme), add it as a token derived from `DESIGN.md` first, then consume it. Do not inline raw values that fight the palette.
- When you genuinely need a value the design system doesn't cover, add/fix the token in `DESIGN.md` + `.impeccable/design.json` and reference it — don't silently extend the palette.

## The review hook is a BLOCKING gate

- The `impeccable` hook runs on edit/write and on Stop and reports `design-system-*` findings.
- Treat every finding as blocking: **do not mark a task done (and do not stop) while any design finding is unresolved on the files you changed.** Fix the violation, or explicitly ack/reconcile it against `DESIGN.md`, before finishing.
<!-- END:design-conformance -->

<!-- BEGIN:stories-context -->
# Story/task context (always observe)

- Product decisions live in `DECISIONS.md` (do not re-litigate them).
- Work is driven by `context/Stories/` — read the current Story file, then its `Task/*.md` files, and implement in numeric order. A task is done only when its Requirement, Steps, Recommendation and acceptance criteria are satisfied.
- When a task is fully completed, move its `.md` file from `context/Stories/Task/` into `context/Stories/Completed-Task/` (keep the filename) and record it in `context/CurrentTask.md`'s History. Leave unfinished tasks in `Task/`.
- Every Story builds from the same design north star summarized in `context/Stories/README.md`.
<!-- END:stories-context -->

<!-- BEGIN:codebase-map -->
# Codebase Map — read this BEFORE exploring the repo

This section describes the **current, actual** structure and conventions so you can
orient yourself without a full codebase exploration. It is the single source of
truth for where things live and how data flows. When the structure changes, update
this section in the same edit.

## Project identity

**Taskspace** — a cobalt-and-paper shared workboard. Next.js 16 App Router + React 19 +
TypeScript, Tailwind CSS v4, shadcn/ui + base-ui primitives, Drizzle ORM + drizzle-kit on
Neon Postgres, BetterAuth (magic-link primary, optional Google), Resend for email.
Path alias: `@/*` → project root.

- **Scripts** (package.json): `dev`/`build`/`start`, `lint` (eslint); `db:generate`/`db:migrate`/`db:push` (drizzle-kit — `drizzle.config.ts` loads `.env.local` itself).
- **Env** (see `.env.example`, real values in gitignored `.env.local`): `DATABASE_URL`,
  `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `TRUSTED_ORIGINS`, `RESEND_API_KEY`,
  `FROM_EMAIL`, optional `GOOGLE_CLIENT_ID/SECRET`, `NEXT_PUBLIC_GOOGLE_ENABLED`.

## Routing (`app/`) — route groups

- **Root `layout.tsx`**: global fonts (Geist + local Archivo display → `--font-archivo` /
  `--font-heading`), `ThemeProvider` (next-themes), `TooltipProvider`, `Toaster`, `globals.css`.
- **`(app)` — protected shell**: `layout.tsx` calls `getCurrentUser()`, redirects to
  `/sign-in` when signed out, renders the cobalt `AppSidebar` + `ProjectNav` + topbar
  (`ModeToggle`). Project list is fetched **server-side here** (`listProjectsForActor`)
  and passed into `ProjectNav`. **`page.tsx` is the current dashboard — still demo/mockup
  data (`"use client"`, hard-coded tasks); the real task UI lands in Story 03/04.**
- **`(public)` — signed-out only**: layout redirects signed-in users to `/`; contains
  `sign-in` (honours a sanitised `next` callback).
- **`invite/[token]/page.tsx`** (top-level, outside both groups so both states reach it):
  accept/decline via the emailed single-use token (hashed lookup, expiry + email-match guards).
- **`(app)/invitations/page.tsx`**: invitee's pending-invitations list (keyed by id, no token).
- **`api/auth/[...all]/route.ts`**: mounts the BetterAuth server handler.

## Layering & data flow (the most important convention)

Data flows one way: **client UI → server actions (`"use server"`) → data-access DAO
(`server-only`) → Drizzle `db`**. Never call the ORM from a component/route/page; never
bypass the DAO. `lib/db/index.ts` is a barrel that re-exports the schema.

1. **`lib/db`** — `schema.ts` (all tables, enums, inferred `$inferSelect`/`$inferInsert`
   types); `index.ts` exports `db` (Neon HTTP driver) for single reads/writes and `dbWrite`
   (Neon WebSocket Pool, required for transactions).
2. **`lib/data-access`** — THE single server choke point for every read/write on app
   entities. Every exported function takes the authenticated **`Actor` as its first
   argument** and enforces membership/role before touching data. **Import from the barrel
   `index.ts`, never the individual files.**
   - `access.ts`: role/permission matrix — `PERMISSIONS`, `assertPermission`,
     `assertProjectAccess`, `hasRole`, `isMemberWithRole`, `assertActiveMember`,
     `canAccessProject`, `getActiveMembership`.
   - `errors.ts`: `AppError` hierarchy with stable codes (`NOT_FOUND`, `FORBIDDEN`,
     `UNAUTHORIZED`, `VALIDATION`, `CONFLICT`).
   - `transaction.ts`: ACID `transaction(tx => …)` via `dbWrite` for any multi-record write
     (e.g. create project + owner membership, transfer ownership).
   - `activity.ts`: append-only stream; `recordActivity` (non-tx) / `recordActivityInTx`.
   - entity modules: `users`, `projects`, `memberships`, `invitations`, `sections`,
     `tasks`, `labels`, `comments`. Each has typed DTOs; reads return `null`/empty for
     non-members (privacy NFR — no partial rows).
3. **`lib/server-actions`** — thin `"use server"` boundary. Every action: `requireActor()`
   (actor always derived **from the session**, never client-supplied ids) → call DAO →
   wrap in `toActionResult()` returning `ActionResult<T>`. `types.ts` defines `ActionResult`
   + `ActionErrorCode` (client-safe, no server-only). `helpers.ts` holds `requireActor` +
   `toActionResult` (server-only). Actions **never throw across the boundary**.
4. **`lib/auth`** — `config.ts` (BetterAuth server: magic-link primary, optional Google,
   30-day sessions, hashed 10-min link, rate-limited); `client.ts` (browser client);
   `get-current-user.ts` (`cache()`d session + `syncUser`).
5. **`lib/email`** — `magic-link.ts`, `invitation.ts` (Resend via plain HTTPS; when
   `RESEND_API_KEY` absent they **log the link** instead of failing — dev fallback; invite
   links built from `APP_ORIGIN`; single-use 7-day tokens stored only as sha256 hashes).

## Data model (`lib/db/schema.ts`)

BetterAuth tables `authUser/Session/Account/Verification` + app tables: `users`
(authProviderId unique, avatarUrl), `projects` (ownerId, status active/archived), `sections`
(position), `projectMemberships` (role, status pending/active/declined/removed, unique
project+user), `tasks` (self-ref `parentTaskId`, `sectionId`, `projectId`, priority p1–p4,
status active/completed, assigneeId, scheduledFor, position, completedAt/By),
`labels` + `taskLabels` (join), `comments` (soft delete via deletedAt), `activityEvents`
(jsonb metadata), `invitations` (`token_hash` only, role editor/viewer, 7-day expiry via
`expiresAt`, status pending/accepted/declined/expired/revoked).
Enums: `project_status`, `project_membership_role`, `project_membership_status`,
`task_priority`, `task_status`, `invitation_role`, `invitation_status`, `activity_action`.
All timestamps are UTC `timestamptz`; all ids are `crypto.randomUUID()` strings.

## Permissions model (`lib/data-access/access.ts`)

Roles: `owner`, `editor`, `viewer` (level order only for diagnostics). `PERMISSIONS` is the
single source of truth: `project:view` (all); `task:write/assign/delete`, `section:write`,
`label:write`, `comment:add` (editor+owner); `comment:moderate`, `member:invite/role/remove`,
`project:admin` (owner). Mutations gate via `assertPermission(actor, projectId, permission)`
inside the DAO. Invites can only ever grant Editor/Viewer — never Owner.

## Auth flow

`getCurrentUser()` → `auth.api.getSession` → `syncUser` (atomic upsert of the internal
`User` keyed on `auth_provider_id`). Protected `(app)` layout redirects signed-out users;
public layout redirects signed-in users. `authClient` (better-auth/react) used on the client
for magic-link + sign-out.

## UI conventions

- **`components/ui/`** = shadcn/base-ui primitives (button, dialog, dropdown, sidebar,
  avatar, sheet, sonner, …). **`components/sidebar/`** = app sidebar domain (`app-sidebar`,
  `project-nav`, `create-project-dialog`). **`components/taskspace/`** = workboard domain
  (daily list, task rows/detail, capture context, search view, selection helpers and global
  workspace shortcuts). Other app components (`invitation-decision-buttons`, `sign-out-button`,
  `theme-provider`) live in `components/`. **`feature/components/`** = feature-domain pieces
  (`ModeToggle`).
- **Design tokens** are defined in `app/globals.css` (`@theme inline` maps shadcn vars;
  sidebar = cobalt `#3543d6`, `--sidebar-primary` = citron `#edff81`, `--sidebar-ring` =
  coral `#ff765d`). **Use tokens, never hard-coded off-palette hex.** The `impeccable`
  design-review hook flags `design-system-*` violations. Display face = `font-heading`
  (Archivo); body/metadata use Aptos/system face. See `DESIGN.md` + `DESIGN-conformance`
  above — they are mandatory for all UI work.

## Docs & workflow

- `context/CurrentTask.md` — session driver / entry point; **read first**.
- `context/Stories/{00..05}-*.md` + `context/Stories/Task/*.md` — ordered Stories/Tasks;
  implement in numeric order; move done tasks to `Completed-Task/`.
- `DECISIONS.md` — architecture decision record (do not re-litigate).
- `context/product-requirements-document.md` — PRD.
- `context/Final-design/taskspace-momentum-prototype.html` — golden visual reference.
<!-- END:codebase-map -->
