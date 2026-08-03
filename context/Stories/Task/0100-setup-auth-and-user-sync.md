# Task 0100 — Setup Auth + User Sync

## Requirement

Implement sign up, sign in and sign out using the provider chosen in Task 0001. When an authenticated identity first enters the product, create the internal `User` record; on later sign-ins, update it (PRD FR-1). Expose a server-side way to get the current authenticated actor.

## Steps

1. Install and configure the chosen auth provider (**BetterAuth**, per Task 0001) with the selected sign-in methods.
2. Add the required routes/handlers (sign in/sign out/callback) and env config per the provider.
3. Write a server-side helper (e.g. `getCurrentUser()`) that returns the authenticated user or `null`.
4. Create or update the internal `User` row on authenticated entry, keyed by `authProviderId`, using the session's stable external id.
5. Update the user's `email` and `displayName` from the provider on each entry.
6. Add sign-in / sign-out UI entry points accessible only in the appropriate state.
7. Verify unauthenticated requests cannot reach protected data (FR-1).

## Recommendation

Wrap all user creation/sync in the data-access layer (Task 0102) so auth providers are decoupled from the DB. Use a transaction for "find-or-create" to avoid race conditions on first sign-in. Return only safe fields to the client. Redirect signed-in users away from the sign-in page and unauthenticated users away from protected pages, never shipping protected data in either bundle.
