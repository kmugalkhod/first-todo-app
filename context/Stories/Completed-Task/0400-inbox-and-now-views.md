# Task 0400 — Inbox + "Now" Views

## Requirement

Provide an Inbox for capturing tasks not yet assigned to a project (FR-5, open decision #5: inbox tasks are private until moved). Inbox supports quick task capture and moving a task into a project (which then checks role). Provide the app's primary "now" work surface for open tasks.

## Steps

1. Implement an Inbox view listing tasks where `projectId = null` for the actor.
2. Support creating an Inbox task (title required; optional fields) via the quick-add composer.
3. Support moving an Inbox task into a project (checks the destination project role, FR-3).
4. Enforce the PRD stance: Inbox tasks are private to the actor until moved (open decision #5) unless a future decision says otherwise.
5. Wire the sidebar Inbox item to this view (shell from Task 0104).
6. Add empty/loading/error states.

## Recommendation

Keep the Inbox as a real filter over `projectId = null` rather than a synthetic project, matching Task 0300's recommendation. Reuse the `TaskRow` component. Since inbox tasks are private until moved, ensure membership/role checks only apply on move. Provide a keyboard-friendly quick-add (the existing `todo:add-task` event/dialog pattern can be generalised) so capture is instant.
