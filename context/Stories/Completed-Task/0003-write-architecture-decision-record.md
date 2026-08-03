# Task 0003 — Write Architecture Decision Record

## Requirement

Produce a single `DECISIONS.md` (architecture decision record / ADR) that records every decision from Tasks 0000–0002: hosting, database, auth, email, storage, security ownership and runbook ownership. Every choice must state the chosen option, the alternatives considered and rejected, the rationale, and the consequences.

## Steps

1. Create `DECISIONS.md` at the repository root (or under `context/`).
2. For each decision, record: status, decision, context, considered alternatives, decision rationale, and consequences (including trade-offs).
3. Document **security ownership** — who is responsible for threat review, dependency patching and incident response for auth/authorisation.
4. Document **runbook ownership** — who operates migrations, backups, restores and deployments.
5. Cross-reference the PRD open decisions (§14) so each is now resolved or explicitly deferred.
6. Confirm Story 01's tasks can reference this file without re-opening the decisions.

## Recommendation

Follow a lightweight ADR format (the "context / decision / status / consequences" template). Keep it short enough to be a reference, not a design document. Resolve the viewer-role staging decision (#4) here even if the answer is "defer Viewer to after Editor collaboration works," because Story 02's permission tests depend on whatever is chosen. Never store secrets, tokens or private keys in this file — reference environment variables and secret-management locations instead.
