# Task 0402 — Upcoming View

## Requirement

Upcoming shows the actor's accessible, incomplete tasks grouped by future date (FR-5), in the user's timezone. Only accessible tasks are included (permission scoping applies).

## Steps

1. Query active tasks scheduled for any future date across accessible projects + inbox.
2. Group tasks by their planned future date (local timezone), ordered by date then by the §5 sort (planned date, then priority).
3. Render grouped date list using the design's ordered, quiet list treatment.
4. Let the user complete/reopen and edit dates from this view.
5. Show loading/empty ("Nothing scheduled") and error states.

## Recommendation

Reuse the date-boundary logic from Task 0401 for consistent timezone handling. Only include dates after the user's current local day. Keep the same `TaskRow` so behaviour and styling stay consistent across Today/Upcoming/project views. Add an accessible group-heading for each date.
