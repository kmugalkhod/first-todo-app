# Task 0305 — Task Detail Panel

## Requirement

Provide a task-detail surface for context and collaboration without forcing navigation away from the current list (FR-3). On desktop it is a persistent pale-periwinkle right panel with a thin divider; on mobile it becomes a fixed bottom sheet retaining the list underneath (design "Detail Record").

## Steps

1. Build the detail panel content: small uppercase project/section kicker, task title, description, property rows (priority, labels, assignee, planned date, section), sub-tasks, comments and activity.
2. Implement the desktop persistent panel alongside the selected list row (no full-screen detour) — select a row to show its record.
3. Implement the mobile bottom sheet that keeps the list visible underneath for context.
4. Make all editable properties editable from the panel via the relevant server actions; Viewers see read-only variant.
5. Ensure the panel reflects updates immediately (server-render after action + optimistic update).
6. Add empty/not-selected and loading/error states.

## Recommendation

Follow the design precisely: panel surface `#fbfbff`-paper family with periwinkle-pale (`#eef0ff`) record surface and left thin divider. Use shadcn `Sheet` for the mobile bottom sheet and `Drawer`-like behaviour. Keep the record component a client component fed by server-fetched task data, so re-selecting a different task swaps content without remounting the shell.
