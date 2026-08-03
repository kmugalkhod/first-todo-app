# Task 0203 — Invitation Emails + Acceptance

## Requirement

Let an Owner invite an existing or email-addressed collaborator as Editor or Viewer, send an email invitation, and let the invitee accept or decline after authenticating with the invited email (FR-2), producing an active membership.

## Steps

1. Implement `inviteMember` server action (Owner only) writing an `Invitation` row and sending an email (Task 0002 provider) with a link carrying the raw token.
2. Handle the "existing user" case by email lookup and the "new user" case by invitation awaiting their first sign-in.
3. Implement an accept/decline route that takes the token, looks up by `tokenHash`, checks `expiresAt`, and activates or declines the membership for the authenticated user whose email matches.
4. Enforce that the authenticated email matches the invited email before activation.
5. Add an "invitations pending" surface for the invitee and expiry handling per the policy chosen in Task 0002.
6. Record an activity event on acceptance/decline.

## Recommendation

The acceptance link should let a signed-out invitee sign in/up first, then continue to acceptance — keep the raw token in a short-lived, signed URL to avoid replay. Guard against token reuse and expiry on the server. Use the email provider's webhooks only if needed for delivery observability; the authoritative state is the DB. If the provider is the decision in Task 0002, test the full loop with a disposable inbox in CI/staging.
