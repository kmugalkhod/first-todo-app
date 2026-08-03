# Task 0307 — Assignment to Members

## Requirement

Let Editors/Owners assign a task to exactly one active project member (FR-6); assignment must not grant project membership or permissions (principle 8). The UI must display the assignee in the row and detail panel (design: citron ownership marker on the selected/owner avatar).

## Steps

1. Implement `assignTask`/`unassignTask` (Editor+) validating that `assigneeId` is an active member of the task's project.
2. Enforce single assignee (a task has zero or one primary assignee — §7 non-negotiables).
3. Never create membership from assignment; verify the assignee already has an active `ProjectMembership`.
4. Render the assignee's avatar in `TaskRow` and the detail panel; use citron for the selected/owner avatar as in the design.
5. Provide an assignee picker (dropdown of active members) in the detail panel.
6. Record an assignment activity event.

## Recommendation

The assignee picker should list only active project members and be Editor+ in the UI, matching the §7 matrix. Reject any assignee who is not an active member at the data layer — this is a deliberate security boundary (principle 8). Display an unassigned state clearly ("No assignee") rather than hiding the field.
