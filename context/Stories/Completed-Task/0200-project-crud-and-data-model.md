# Task 0200 — Project CRUD + Data Model

## Requirement

Implement create, read, rename, describe, archive and list of projects (FR-2). Creating a project must atomically make the actor the owner via a `ProjectMembership` row (reliability NFR). Archiving hides the project from active views while preserving its data for restoration (FR-2).

## Steps

1. Implement `createProject` server action: create the `Project` row and a `ProjectMembership(role=Owner, status=active)` in one transaction.
2. Implement `listProjects` returning only projects where the actor is an active member.
3. Implement `renameProject` and `describeProject` (Owner only per §7).
4. Implement `archiveProject` (Owner only), setting `Project.status`; ensure archived projects are excluded from active views but restorable.
5. Implement `restoreProject` (Owner only).
6. Keep project deletion as an explicit, recoverable archive action in the MVP unless a retention policy decides otherwise (PRD §7).
7. Add a `ProjectActivityEvent` on create/archive so activity is attributable.

## Recommendation

Put all project writes behind the data-access layer and the role check from Task 0204. Use `created_at`/`updated_at` timestamps in UTC. Because a new project should appear instantly, return the created project from the action and optimistically update the client list. Soft-delete nothing except via explicit `status` transitions; do not hard-delete projects in the MVP.
