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
