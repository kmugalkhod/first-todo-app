# Story 02 — Shared Projects & Membership

**Milestone:** M2 — Shared projects
**Depends on:** Story 01
**Goal:** Let an owner create a project, invite collaborators with a role, and have invitations accepted so members see the shared space. Enforce Owner/Editor/Viewer permissions on every server operation.

## Context

Projects and membership are the heart of the Shared MVP. Concepts in this Story map to PRD FR-2 and the §7 roles/permissions matrix. The design converts the prototype's "focus board" navigation into project navigation with people avatars (see `DESIGN.md` / prototype).

## In scope

- Create, rename, describe, archive and list projects owned by a user (FR-2).
- Invite an existing or email-addressed collaborator as Editor or Viewer; pending/accepted/declined/removed states (FR-2).
- Accept / decline an invitation after authenticating with the invited email.
- Owner-only controls: invite, change roles, remove members, transfer ownership, archive/delete (recoverable archive).
- Role enforcement on every server-side read and mutation.

## Out of scope

- Task building within a project (Story 03).
- Email delivery wiring beyond the decision made in Story 00.

## Acceptance

- Creator becomes owner automatically and atomically with project creation (reliability NFR).
- A new user can sign up, create a project, invite an Editor, and see the Editor become active after acceptance (§12).
- Pending, accepted and removed memberships are distinguishable.
- Non-members cannot read or discover the project; Viewers cannot mutate it (§12, §7).

## Corresponding tasks

- [`./Task/0200-project-crud-and-data-model.md`](./Task/0200-project-crud-and-data-model.md)
- [`./Task/0201-project-list-and-creation-ui.md`](./Task/0201-project-list-and-creation-ui.md)
- [`./Task/0202-membership-and-invitation-data-model.md`](./Task/0202-membership-and-invitation-data-model.md)
- [`./Task/0203-invitation-emails-and-acceptance.md`](./Task/0203-invitation-emails-and-acceptance.md)
- [`./Task/0204-role-permission-matrix-and-enforcement.md`](./Task/0204-role-permission-matrix-and-enforcement.md)
- [`./Task/0205-member-management-ui.md`](./Task/0205-member-management-ui.md)
- [`./Task/0206-project-archive-and-manage-ui.md`](./Task/0206-project-archive-and-manage-ui.md)
