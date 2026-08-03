# Task 0103 — Add Server-Action Boundary

## Requirement

Expose all product mutations as server actions (or route handlers) that run on the server, re-authenticate the actor, re-check permissions, validate input and write through the data-access layer (Task 0102). Client code must never be able to pass user-id or role identifiers that are trusted (security NFR).

## Steps

1. Define the set of server actions needed across all Stories (createProject, inviteMember, createTask, completeTask, addComment, moveTask, etc.).
2. Implement each action to: read the authenticated actor server-side → verify membership/role → validate input → write via the data-access layer → return a typed result or error.
3. Never trust client-sent `userId`/`role`/`projectId` for authorisation — derive the actor from the session and resolve the resource from the DB.
4. Return structured, recoverable error results (validation, permission-denied, not-found) rather than throwing opaque errors.
5. Add `use server` semantics and enforce server-only imports for DB and auth code.
6. Create shared action type definitions used by the client components.

## Recommendation

Put all server-only code (DB, auth, secrets) under a `server/` boundary and never import it into client bundles. Return serialisable result objects (`{ ok } | { error: { code, message? } }`) so the UI can show recoverable errors and preserve input. Because Story 05 requires negative-permission tests on server actions, keep each action thin and delegating to the data-access layer so it can be tested in isolation.
