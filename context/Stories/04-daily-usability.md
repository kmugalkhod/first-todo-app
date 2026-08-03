# Story 04 — Daily Usability

**Milestone:** M4 — Daily usability
**Depends on:** Story 03
**Goal:** Give collaborators dependable daily views (Inbox, Today, Upcoming, project view), project navigation, search and an attributable activity feed.

## Context

These are the "find the right task in seconds" views (PRD §3, success measures). Today/Upcoming are timezone-aware and permission-scoped; search covers the member's accessible tasks and projects; activity makes membership and task changes attributable (FR-7).

## In scope

- Inbox / unassigned-to-project capture (FR-5).
- Today: accessible incomplete tasks scheduled for the local day + overdue (FR-5).
- Upcoming: accessible incomplete tasks grouped by future date (FR-5).
- Project view: active tasks by section, reveal completed on demand (FR-5).
- Manual ordering within a section, then planned date, then priority; clarify automatic sorting (FR-5).
- Search across accessible tasks and projects (FR-7).
- Project/task activity feed with actor, action, target, timestamp (FR-6, principle 7).

## Out of scope

- Calendar sync, time tracking, AI, automation (explicitly excluded by PRD §15).

## Acceptance

- Today/Upcoming include only accessible incomplete tasks per the timezone rule (§12).
- A collaborator can locate and complete an assigned task in under 30 seconds.
- Completion and membership changes appear in the activity feed with actor + timestamp (§12).
- Search never returns or links to inaccessible projects/tasks.

## Corresponding tasks

- [`./Task/0400-inbox-and-now-views.md`](./Task/0400-inbox-and-now-views.md)
- [`./Task/0401-today-view.md`](./Task/0401-today-view.md)
- [`./Task/0402-upcoming-view.md`](./Task/0402-upcoming-view.md)
- [`./Task/0403-project-view-with-sections.md`](./Task/0403-project-view-with-sections.md)
- [`./Task/0404-ordering-and-sorting.md`](./Task/0404-ordering-and-sorting.md)
- [`./Task/0405-search.md`](./Task/0405-search.md)
- [`./Task/0406-activity-feed.md`](./Task/0406-activity-feed.md)
