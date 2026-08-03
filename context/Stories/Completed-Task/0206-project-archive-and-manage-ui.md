# Task 0206 — Project Archive + Manage UI

## Requirement

Provide Owner-facing project management UI for rename, description edit, archive/restore, and (per design) a "Create" flow. Archiving must hide the project from active views while preserving data for restoration (FR-2).

## Steps

1. Add a project header with the title (Archivo Display), description and an Owner-only manage menu (rename, archive, members, transfer).
2. Implement the archive/restore actions calling `archiveProject`/`restoreProject`.
3. Show archived projects in a separate "Archived" area (read-only) with a restore affordance, per the design's sidebar project-status handling.
4. Implement rename/description-edit inline or in a dialog.
5. Ensure archived projects are excluded from Inbox/Today/Upcoming/Search active results (Story 04 cross-check).
6. Add loading/error/empty states for the header and archived list.

## Recommendation

Keep archive semantics as a `status` field transition (not a hard delete) so future retention policy can decide on permanent deletion. Make the manage menu Owner-only in the UI and enforced on the server via the §7 matrix. Reuse shadcn `DropdownMenu`/`AlertDialog` styled to Taskspace tokens, and confirm destructive-ish actions (archive) with a lightweight confirmation.
