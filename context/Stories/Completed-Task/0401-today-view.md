# Task 0401 — Today View

## Requirement

Today shows the actor's accessible, incomplete tasks scheduled for the local current day plus overdue tasks (FR-5). Timezone handling must render in the user's configured browser timezone while data is stored in UTC (time NFR).

## Steps

1. Query tasks where status = active, scheduled for today in the user's timezone, plus overdue (scheduled before today and incomplete), for all accessible projects + inbox.
2. Compute "today" boundary using the user's timezone (pass the client's `IANA` timezone to the server or compute the range server-side from an offset).
3. Group or label overdue distinctly using coral attention styling and a clear text label (overdue ≠ deadline per the design).
4. Let the user complete/reopen tasks directly from this view via `TaskRow`.
5. Support editing task date from here when needed.
6. Add empty state ("You're all caught up") and loading/error states.

## Recommendation

Compute the day boundary with a timezone library (`date-fns` is already present; use its `tz` utilities or `Intl`). Store all `scheduledFor` in UTC and convert to the user's local day for grouping. Because the timezone rule is a release acceptance criterion (§12), add a unit test that pins the today/overdue boundary behaviour. Reuse `TaskRow` for consistent rendering.
