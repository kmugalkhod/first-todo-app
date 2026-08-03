# Task 0300 — Task Data Model + CRUD

## Requirement

Implement task CRUD: create, edit, complete/reopen, delete in a project. A task requires a non-empty title; it may have description, project, section, priority, labels, one assignee, planned date/time, and sub-task relationships (FR-3). Inbox tasks have no project; moving one to a project checks the actor's project role (FR-3).

## Steps

1. Implement `createTask` validating a non-empty title and optional fields; validate all editable fields server-side (FR-3).
2. Implement `updateTask` for editable fields with the same validation.
3. Implement `deleteTask` (authorised; project refers to deletion scope — FR-3).
4. Implement "move task to project" that checks the destination project role (FR-3).
5. Enforce a task's `projectId`, `sectionId` and sub-task parent share a project (FR-4/§7 non-negotiables).
6. Ensure tasks carry `status`, `position`, `priority`, `scheduledFor`, `assigneeId`, `completedAt`, `completedBy` per PRD §10.
7. Persist changes atomically and record activity events for attributable change (principle 7).

## Recommendation

Represent Inbox as `projectId = null` rather than a synthetic project. Validate on the server using the ORM/action validators (e.g. zod) and return recoverable errors. Keep `position` integer for manual ordering (Story 04). Because assignment grants no access (principle 8), never derive membership from `assigneeId`.
