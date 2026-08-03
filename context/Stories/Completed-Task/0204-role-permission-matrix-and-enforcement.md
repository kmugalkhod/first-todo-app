# Task 0204 — Role Permission Matrix + Enforcement

## Requirement

Enforce the PRD §7 roles/permissions matrix server-side on every read and mutation. Owner, Editor and Viewer capabilities must be checked; no node may rely on client-supplied identifiers (security NFR). Assignment must not grant membership (principle 8).

## Steps

1. Implement the §7 matrix as data (see table below): which actions each role may perform to the data-access layer's guard.
2. Build the shared guard (`can(actor, projectId, permission)`) used by every repository query in Task 0102.
3. Guard reads: Viewers and Editors can view; non-members get nothing.
4. Guard mutations: create/edit/complete/reopen/assign/comment require Editor+; invite/role/remove/archive/transfer require Owner.
5. Ensure a removed/non-active member immediately loses access, including existing sessions (re-check membership per request, not cached).
6. Enforce that assignment only references an active project member and does not create access.
7. Add unit tests for each matrix cell (extended in Story 05).

| Action | Owner | Editor | Viewer |
|---|:-:|:-:|:-:|
| View project/tasks/comments/activity | ✔ | ✔ | ✔ |
| Create/edit/complete/reopen tasks | ✔ | ✔ | ✘ |
| Sections, labels, order | ✔ | ✔ | ✘ |
| Add comments | ✔ | ✔ | ✘ |
| Assign task | ✔ | ✔ | ✘ |
| Invite / change roles | ✔ | ✘ | ✘ |
| Remove members | ✔ | ✘ | ✘ |
| Transfer / archive / delete | ✔ | ✘ | ✘ |

## Recommendation

Represent permissions declaratively (a role→permission map) and derive UI affordances from the same map so the UI hides/ disables actions the actor cannot perform, and the server still enforces them (defence in depth). Re-check membership on every request rather than caching roles in the session, so removals take effect immediately. Keep the guard pure and unit-testable.
