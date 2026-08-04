# Task 0406 — Activity Feed

## Requirement

Show attributable changes for the project and its tasks: membership changes, task changes, completion changes and comments (FR-6, principle 7). Each event shows the actor, action, target and timestamp; it must not leak inaccessible content (privacy NFR).

## Steps

1. Implement `activity` reads from the `ActivityEvent` table, scoped to the actor's accessible projects.
2. Ensure every relevant mutation writes an `ActivityEvent` (project create/archive, membership accept/decline/remove/role, task create/edit/complete/reopen/assign, comment add/delete, section/label changes).
3. Render the feed with actor (avatar/name), action verb, human-readable target, and timestamp.
4. Group/render newest-first with clear relative time (use `date-fns`).
5. Never surface the body of content the actor cannot access; keep event metadata minimal.
6. Add empty/loading/error states.

## Recommendation

Make `ActivityEvent` append-only per PRD §10 (soft-delete comments so deleted content still yields an event, not a broken reference). Reuse the actor avatar and timestamp formatting already used in comments. Keep the event `action`/`metadata` a controlled enum to make rendering and testing predictable. The feed appears in the project header/detail panel per Story 03/04 designs.
