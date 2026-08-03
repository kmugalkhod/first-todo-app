# Task 0302 — Sections + Ordering

## Requirement

Let Editors/Owners add, rename, reorder and remove project sections (FR-5). Section ordering must be preserved; removing a section must not orphan its tasks (schema handling from Task 0101).

## Steps

1. Implement `createSection`, `renameSection`, `reorderSections`, `removeSection` server actions (Editor+).
2. Store `position` on `Section` and maintain consistent ordering on reorder and insert.
3. Define remove behaviour: either reassign section's tasks to a default section or block removal while tasks exist — choose one and enforce it (no orphans).
4. Enforce that section and its tasks share the same project.
5. Expose section list + ordering to the project view (Task 0403).
6. Update activity on section changes.

## Recommendation

Choose a deterministic remove policy and document it (e.g. "removing a section moves its tasks to the project's 'No section' bucket"). Use a `position` integer and reorder via a single transaction. For the MVP, favour simple explicit ordering over drag-and-drop (drag is not required and must not be the only path per responsive NFR) — provide up/down/reorder controls as an accessible alternative.
