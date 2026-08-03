# Task 0405 — Search

## Requirement

Search across the member's accessible tasks and projects (FR-7). Results must never include or link to projects/tasks the actor cannot access (privacy NFR, principle of minimum disclosure). Include task titles, descriptions and project names.

## Steps

1. Implement a server-side search query scoped by the actor's active memberships + inbox (only accessible rows).
2. Match task title, description and project name (FR-7). Optionally match comments/labels if useful, but keep MVP scope tight.
3. Exclude archived projects (per archive semantics) from active search unless archived search is deliberate.
4. Render accessible search results grouped (tasks vs projects) with a clear empty/no-results and loading state.
5. Wire the `searchbox` in the topbar (design) to this view/results.
6. Add a unit test: a non-member's query returns nothing for the inaccessible project.

## Recommendation

Keep search server-side and membership-scoped at the query level so no post-filtering can leak (do not filter client-side after fetching). Use the DB's search capabilities or a simple ILIKE/trigram index on title/description for the MVP; full-text index is optional. However the design specifies a `command`-style palette (`cmdk` is already in `node_modules`), so consider surfacing search via the keyboard palette while keeping the server-scoped results.
