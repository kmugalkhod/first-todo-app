# Task 0101 — Create Database Schema + Migrations

## Requirement

Create versioned, reproducible migrations for the full PRD §10 data model: `User`, `Project`, `ProjectMembership`, `Section`, `Task`, `Label`, `TaskLabel`, `Comment`, `ActivityEvent` and `Invitation`. Include all key fields, indexes, constraints and UTC timestamp handling described in the PRD.

## Steps

1. Configure the ORM (Drizzle or Prisma per Task 0000) and connect to the dev database.
2. Define the schema per PRD §10, adding: `ProjectMembership.role` and `status`, `Task.parentTaskId` (self-reference for sub-tasks), `TaskLabel` join with project-scope validation, `Comment.deletedAt` (soft delete), `Invitation.tokenHash` (never raw), and `ActivityEvent.action/metadata`.
3. Add constraints: a task's `projectId`, `sectionId` and sub-task parent must resolve to the same project; assignment must reference an active project member.
4. Add indexes for common queries: tasks by project+section, today/upcoming by `scheduledFor`, membership by project, invitations by email+tokenHash, activity by project timestamp.
5. Generate the initial migration and a seeded dev script if useful.
6. Add separate migrations for any later schema changes; keep them incremental and reviewable.

## Recommendation

Store timestamps as UTC (`timestamptz` in Postgres) per the time-handling NFR. Add DB-level unique constraints on the natural keys (`ProjectMembership` per project/user). Use foreign keys with `ON DELETE` behaviour that prevents orphaned tasks when a section is removed. Keep migrations versioned in the repo and apply them with the same tool in CI and production so schema drift is impossible.
