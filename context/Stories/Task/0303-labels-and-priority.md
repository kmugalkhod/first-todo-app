# Task 0303 — Labels + Priority

## Requirement

Let project members create labels (project-scoped) and apply multiple labels to a task (FR-5). Support priority P1–P4 with P3 as the default (§7 non-negotiables), rendered as the design's semantic pill palette (P1 coral, P2 warm yellow, P3 periwinkle, P4 cool gray).

## Steps

1. Implement label CRUD scoped to a project (`createLabel`, `renameLabel`, `deleteLabel`) — Editor+ per §7.
2. Implement apply/remove label to task via the `TaskLabel` join, validating matching project scope (PRD §10).
3. Implement priority as P1–P4 with server validation; default to P3 on create.
4. Surface priority pills and label chips in `TaskRow` (Task 0301) and the detail panel (Task 0305).
5. Render priority pills with their semantic backgrounds as control-affordances (per design "Pills").
6. Keep labels green-tinted category chips, distinct from priority pills.

## Recommendation

Scope labels to the project in the MVP (PRD §5), so the join must validate `Task.projectId === Label.projectId` (DB constraint + layer check). Priority is an ordering signal, not an SLA/escalation — do not implement automatic escalation (design principle 5). Render both as non-interactive chips in rows; editing lives in the detail panel.
