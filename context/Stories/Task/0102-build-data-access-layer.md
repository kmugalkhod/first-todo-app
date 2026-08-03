# Task 0102 — Build Data-Access Layer

## Requirement

Create a single data-access layer that centralises every server-side read and write and enforces membership/role checks. Nothing bypasses it — this is the enforcement point for all of PRD §11 security/privacy and §7 permissions.

## Steps

1. Create repository/DAO modules (`users`, `projects`, `memberships`, `tasks`, `sections`, `labels`, `comments`, `activity`) that take the authenticated actor as the first argument.
2. Build a reusable "can the actor access this project / with this role?" check (Task 0204 defines the matrix).
3. Ensure every query scopes by membership — a non-member receives nothing, never a partial row (privacy NFR).
4. Ensure every mutation checks role before writing and validates all input server-side.
5. Return only the fields a screen needs (minimum disclosure). Strip sensitive fields at the layer boundary.
6. Wrap multi-record writes (e.g. project + owner membership) in transactions for atomicity (reliability NFR).

## Recommendation

Make the layer the only place that touches the ORM for these entities — components and actions must not query the DB directly. Keep the actor and role checks as explicit, testable functions rather than scattering `if (role===...)` checks inline. Prefer returning typed DTOs over raw ORM rows. This single choke point is what makes the negative-permission tests in Story 05 reliable.
