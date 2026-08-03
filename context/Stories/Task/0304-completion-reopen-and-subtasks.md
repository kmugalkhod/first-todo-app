# Task 0304 — Completion/Reopen + Sub-tasks

## Requirement

Let Editors/Owners complete or reopen a task; completion records `completedAt` and `completedBy` (FR-4, principle 6). Support sub-tasks up to four levels deep, all sharing the parent's project; completing a parent must not silently complete unfinished sub-tasks (FR-4), and the UI must make unfinished child work visible.

## Steps

1. Implement `completeTask` recording `completedAt`/`completedBy`, and `reopenTask` clearing them.
2. Implement sub-task create/edit/delete via `parentTaskId`; enforce depth ≤ 4 and shared-project (DB + layer checks).
3. Define parent-completion behaviour: mark the parent complete but keep unfinished sub-tasks open; surface an indicator (e.g. a workflow/expand showing N unfinished sub-tasks).
4. Render completed state in `TaskRow` using the design's non-colour-only control (green filled control + strikethrough for completed sub-tasks, cobalt for parent completion per design).
5. Add expand/collapse for sub-tasks in the list and detail panel.
6. Record activity on completion/reopen and sub-task changes.

## Recommendation

Enforce sub-task depth in both the data layer and DB (a max-depth check before insert) to prevent cycles and deeper-than-4 nesting. Do not cascade parent completion to children — instead show an accessible "2 of 3 sub-tasks done" affordance. Follow the design's explicit rule: completed sub-tasks use green + strikethrough; completed parent uses cobalt-filled control.
