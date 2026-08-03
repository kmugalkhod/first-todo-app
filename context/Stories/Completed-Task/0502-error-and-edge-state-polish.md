# Task 0502 — Error + Edge-State Polish

## Requirement

Ship accessible empty, loading, error and permission-denied states for every major surface; recoverable mutation errors must display without silently losing user input (PRD §11 reliability NFR; §12). Preserve input on failure.

## Steps

1. Audit each view (project, Inbox, Today, Upcoming, search, detail, members, invitations) for empty, loading, error and permission-denied states.
2. Add loading skeletons/spinners and clear empty states (design + shadcn `Skeleton`/`Empty` present).
3. Ensure recoverable mutation errors render inline (per-action) and the submitted form keeps the user's input (reliability NFR).
4. Add a permission-denied state for Viewers attempting a mutation and a 403-handling surface for direct requests to inaccessible routes.
5. Add a global error boundary and per-view error boundaries that do not destroy the shell.
6. Validate that optimistic updates roll back cleanly on server error.

## Recommendation

Standardise on small reusable state components (`Empty`, `Skeleton`, `InlineError`) styled to Taskspace tokens. Make every server action return a typed `{ error }` that the form maps to an inline message while preserving field values. The §12 list explicitly requires accessible empty, loading, error and permission-denied states, so treat them as first-class deliverables, not afterthoughts.
