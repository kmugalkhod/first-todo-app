# Story 03 — Shared Work Loop

**Milestone:** M3 — Shared work loop
**Depends on:** Story 02
**Goal:** Let members create, organise and coordinate tasks within a project: sections, labels, priorities, a single assignee, completion/reopen, sub-tasks and comments, all surfaced in a task-detail panel.

## Context

This is the core collaborative loop (PRD §9 "Coordinate a task"). It is where the "taskspace" design shines: a structured paper list beside a persistent detail record, with citron ownership markers and coral attention signals.

## In scope

- Task CRUD: create/edit/complete/reopen/delete in a project; Inbox tasks with no project (FR-3).
- Task structure: title, description, section, priority (P1–P4), labels, one assignee, planned date/time, sub-tasks up to 4 levels (FR-3, FR-4).
- Sections: add/rename/reorder/remove (FR-5).
- Labels: project-scoped create and multi-apply (FR-5).
- Completion records `completedAt`/`completedBy`; reopening allowed (principle 6).
- Sub-tasks: parent completion must not silently complete unfinished children (FR-4).
- Comments: add/delete own, author + timestamp (FR-6).
- Task-detail surface without forcing navigation away from the list (FR-3).

## Out of scope

- Today/Upcoming/search/activity views (Story 04).
- File uploads / rich mentions (deferred, FR-6).

## Acceptance

- An Editor can create a task, assign it to an active member, comment and complete it (§12).
- Sub-tasks stay in the same project; parent completion surfaces unfinished children (§7 non-negotiables).
- Viewers can view but cannot trigger or submit edit/complete/assign/comment mutations (§12).

## Corresponding tasks

- [`./Task/0300-task-data-model-and-crud.md`](./Task/0300-task-data-model-and-crud.md)
- [`./Task/0301-task-list-row-and-resources.md`](./Task/0301-task-list-row-and-resources.md)
- [`./Task/0302-sections-and-ordering.md`](./Task/0302-sections-and-ordering.md)
- [`./Task/0303-labels-and-priority.md`](./Task/0303-labels-and-priority.md)
- [`./Task/0304-completion-reopen-and-subtasks.md`](./Task/0304-completion-reopen-and-subtasks.md)
- [`./Task/0305-task-detail-panel.md`](./Task/0305-task-detail-panel.md)
- [`./Task/0306-comments.md`](./Task/0306-comments.md)
- [`./Task/0307-assignment-to-members.md`](./Task/0307-assignment-to-members.md)
