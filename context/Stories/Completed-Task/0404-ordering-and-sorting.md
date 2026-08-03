# Task 0404 — Ordering + Sorting

## Requirement

Define and implement task ordering: manual order within a section, then planned date, then priority (FR-5). Automatic sort's behaviour must be explicit and clear to the user. Provide accessible reordering (no drag-only path).

## Steps

1. Implement `reorderTask` within a section that updates `position` in a transaction.
2. Implement the default sort: manual `position` within a section, then planned date, then priority.
3. Surface "Sort by" controls (e.g. manual, date, priority) and clearly label the active automatic sort.
4. Provide accessible alternatives to drag-and-drop for reordering (up/down controls or move-to-position) per the responsive NFR.
5. Keep ordering deterministic and stable across re-renders.
6. Update activity on reorder if it should be attributable (keep minimal to avoid feed noise).

## Recommendation

The design lists manual order as the MVP default but the PRD says "automatic sort must make its behaviour clear." Choose one clear, documented default (the design favours manual within a section, then date/priority) and expose it explicitly. For MVP, prefer explicit reorder controls over a full drag-and-drop library to keep it accessible and simple; drag can be additive later. Make the sort state part of the view's URL/route so it is shareable.
