# Task 0202 — Membership + Invitation Data Model

## Requirement

Implement the `ProjectMembership` and `Invitation` data model and operations so pending, accepted, declined and removed memberships are distinguishable (FR-2). `Invitation` stores only a `tokenHash` and `status` with an `expiresAt`, never a reusable raw token (PRD §10).

## Steps

1. Define `ProjectMembership` operations: `addPending`, `activate`, `decline`, `remove`, `changeRole` (role transitions per §7).
2. Define `Invitation` operations: `create`, `findByTokenHash`, `markExpired`, `consume`.
3. Store only `tokenHash` of the invitation token (hash with a secure one-way hash; keep the raw token only in the returned/emailed link).
4. Enforce uniqueness (one membership per project/user) and role/status constraints (e.g. an Owner may not be removed; a final owner may not be removed — PRD §7).
5. Enforce that an invitation's role is Editor or Viewer, and only the Owner creates invitations.
6. Tie invitation status to membership lifecycle so acceptance creates an active membership and declines mark it declined.

## Recommendation

Generate a high-entropy single-use token (e.g. 32+ random bytes), hash it with a slow/N/A hashing function appropriate for reveal-by-link tokens (e.g. SHA-256 of a high-entropy token is acceptable), and store only the hash. Use transactions when a status change must agree between `Invitation` and `ProjectMembership`. Never return the raw token from any query.
