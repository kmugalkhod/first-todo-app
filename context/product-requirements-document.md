# Shared MVP — Product Requirements Document

**Status:** Draft for confirmation  
**Product:** First Todo App  
**Release:** Shared MVP (web)  
**Last updated:** 2 August 2026  
**Reference:** [Todoist feature inventory and product analysis](./deep-research-report.md)

## 1. Product decision

Build a responsive web application that helps small groups capture, organise and complete work together. The first release is a **Shared MVP**, not a full Todoist clone and not a portfolio-management product.

The product must make the core shared-work loop dependable:

1. A signed-in user creates a project.
2. They invite collaborators with an appropriate project role.
3. Anyone with permission captures and organises tasks.
4. A task has one clear assignee, a schedule and contextual detail.
5. Collaborators can complete work, comment and see relevant changes.

## 2. Problem and opportunity

Small teams and households need a lightweight way to make shared commitments visible without configuring a heavyweight project-management system. A plain personal task list does not answer who owns a task, where work belongs, or what changed. Complex project tools impose more configuration and process than these groups need.

This product will provide a deliberately small set of composable primitives—projects, sections, tasks, sub-tasks, labels, assignees, dates and comments—so teams can coordinate everyday work quickly.

## 3. Target users

| User | Situation | Need | Success looks like |
|---|---|---|---|
| Project owner | Starts a household, client, volunteer or small-team project | Set up a shared space and retain control | Can create a project, invite people and see progress without an admin burden |
| Collaborator | Receives assigned or shared work | Understand and update their commitments | Can find, complete and discuss the right task in seconds |
| Viewer (optional MVP role) | Needs visibility but should not change work | Follow progress safely | Can read projects and task detail without edit controls |

The initial design target is teams of 2–20 people. It is not designed for enterprise governance, portfolio planning or regulated data handling.

## 4. Goals

### Release goals

- Let authenticated users create and manage shared projects.
- Make task ownership, status and schedule clear at a glance.
- Preserve task context through descriptions, sub-tasks, labels and comments.
- Enforce project permissions on every server-side read and mutation.
- Work well with keyboard, screen reader, desktop and mobile-web input.
- Persist data reliably between sessions and users.

### Product success measures

- A new owner can create a project, invite a collaborator and assign a first task in under five minutes.
- A collaborator can locate and complete an assigned task in under 30 seconds.
- At least 80% of created tasks receive a project; assigned tasks visibly identify one owner.
- No user can read or mutate a project for which they are not an active member.
- Core task actions (create, edit, complete, comment) succeed or present a recoverable error state.

## 5. Scope

### In scope for the Shared MVP (P0)

| Area | Requirement |
|---|---|
| Identity | Sign up, sign in, sign out and a minimal user profile (display name, avatar optional). |
| Projects | Create, rename, describe, archive and list projects owned by a user. |
| Membership | Invite an existing or email-addressed collaborator, accept/remove membership and set a project role. |
| Roles | `Owner`, `Editor`, and `Viewer` roles with the permissions defined below. |
| Task core | Create, edit, complete, reopen and delete tasks in a project; show completed state. |
| Task structure | Title, optional description, section, priority, labels, one assignee, due date/time and sub-tasks. |
| Planning views | Inbox/unassigned-to-project capture, Today, Upcoming and project list views. |
| Collaboration | Task comments, @mention-ready plain text, assignment and a project/task activity feed. |
| Discovery | Project navigation plus search across the member’s accessible tasks and projects. |
| Quality | Responsive UI, accessible controls, loading/empty/error states, durable persistence and authorization. |

### Explicitly out of scope for this release

- Paid plans, billing, plan limits, multi-workspace administration or central invoicing.
- Calendar provider OAuth, calendar event sync, iCalendar feeds, time blocking and task duration.
- Push, email, custom, recurring or location reminders.
- Natural-language date parsing, voice capture, AI extraction, AI writing assistance or AI-generated templates.
- Browser extensions, native iOS/Android/desktop apps, widgets, global shortcuts and offline-first synchronisation.
- Third-party automation, public API, webhooks, integrations, imports/exports and templates.
- Dependencies, Gantt charts, capacity planning, time tracking, approval flows, budgets or portfolio reporting.
- Enterprise SSO/SCIM, data residency selection, legal holds or advanced compliance controls.

## 6. Core product rules

1. **Projects own tasks.** A task belongs to exactly one project after it leaves the Inbox. Sections organise only tasks within their project.
2. **One accountable assignee.** A task has zero or one assignee. Shared work is represented as sub-tasks or separate tasks, never multiple primary assignees.
3. **Project membership gates access.** A user must be an active member of a project to read it. Every mutation verifies membership and role on the server.
4. **Schedule is not a deadline.** The MVP supports a planned due date/time. A separate hard deadline is deferred and must not be silently conflated with the schedule.
5. **Priority is an ordering signal.** Support four levels: P1 (urgent), P2 (high), P3 (medium/default), P4 (low). Do not promise SLA or automatic escalation.
6. **Completion is reversible.** Completing a task records who and when; an authorised user can reopen it.
7. **Changes are attributable.** Membership, task and comment changes write an activity event that shows actor, action, target and timestamp.
8. **No hidden access through assignment.** Assignment does not grant project membership or permissions.

## 7. Roles and permissions

| Action | Owner | Editor | Viewer |
|---|:---:|:---:|:---:|
| View project, tasks, comments and activity | Yes | Yes | Yes |
| Create, edit, complete and reopen tasks | Yes | Yes | No |
| Create and edit sections, labels and task ordering | Yes | Yes | No |
| Add comments | Yes | Yes | No |
| Assign a task to an active project member | Yes | Yes | No |
| Invite members and change Editor/Viewer roles | Yes | No | No |
| Remove members | Yes | No | No |
| Transfer ownership or archive/delete project | Yes | No | No |

An owner may not remove the final owner. Project deletion should be an explicit, recoverable archive action in the MVP unless a future retention policy permits permanent deletion.

## 8. Functional requirements

### FR-1: Authentication and account

- Users must authenticate before accessing product data.
- The system must create or update an internal user record when an authenticated identity first enters the product.
- Unauthenticated visitors must be directed to sign in; protected data must not be included in the response or client bundle.

### FR-2: Projects and membership

- An authenticated user can create a project with a required name and optional description.
- The creator becomes the project owner.
- The owner can invite people by email and choose Editor or Viewer before sending the invite.
- Pending, accepted and removed memberships must be distinguishable.
- An invitee can accept or decline an invitation after authenticating with the invited email address.
- The owner can archive a project; archive must hide it from active views while preserving its data for authorised restoration.

### FR-3: Task creation and editing

- An Editor or Owner can create a task from Inbox, Today or a project.
- A task requires a non-empty title. It may include description, project, section, priority, labels, assignee and planned date/time.
- A task in Inbox has no project; moving it to a project checks the actor’s project role.
- Editors and Owners can update a task. All editable fields must be validated on the server.
- The UI must provide a task detail surface for context and collaboration without forcing navigation away from the current list.

### FR-4: Task completion and sub-tasks

- An Editor or Owner can complete or reopen a task.
- Completion records `completedAt` and `completedBy`.
- A task can have sub-tasks up to four levels deep; every descendant stays in the same project as its parent.
- Completing a parent must not silently complete unfinished sub-tasks. The UI should make unfinished child work visible.

### FR-5: Organisation and views

- Project members can add, rename, reorder and remove sections.
- Project members can create labels and apply multiple labels to a task; labels are scoped to the project for the MVP.
- Today shows accessible, incomplete tasks scheduled for the local current day plus overdue tasks.
- Upcoming shows accessible, incomplete tasks grouped by future date.
- Project view shows active tasks by section and can reveal completed tasks on demand.
- Supported sort order in the MVP: manual order within a section, then planned date, then priority. Automatic sort must make its behaviour clear.

### FR-6: Assignment and comments

- Editors and Owners can assign a task only to an active project member.
- Members can add and delete their own comments; Owners can moderate any comment.
- Comments support plain text and links in the MVP. File uploads, audio and rich mentions are deferred.
- The UI must display author and timestamp for every comment.

### FR-7: Search and activity

- Search returns only projects and tasks the current user may access.
- Search supports task title, description and project name in the MVP; advanced filter syntax is deferred.
- Activity records at minimum: project created/archived, member invited/removed/role changed, task created/updated/completed/reopened/deleted, assignment changed and comment added/deleted.
- Activity entries must identify the actor and time, but must not expose prior sensitive content beyond the current viewer’s permissions.

## 9. Key user flows

### Create and share a project

1. Signed-in user selects **New project**.
2. User supplies a name and optional description.
3. The system creates the project and Owner membership atomically.
4. Owner invites one or more people, choosing Editor or Viewer.
5. Invitee authenticates, accepts and appears as an active member.

### Coordinate a task

1. Owner or Editor creates a task in a project/section.
2. They set a priority, optional planned date and one assignee.
3. Assignee opens Today, Upcoming or the project, reads task detail and comments.
4. Assignee adds progress context as a comment and completes the task.
5. The activity feed makes the change visible to project members.

### Recover from an error or permission boundary

1. A user attempts a mutation.
2. The server validates identity, project membership, role and input.
3. On failure, the UI preserves entered data where safe and provides a clear, non-sensitive explanation.
4. No forbidden record is returned or partially updated.

## 10. Conceptual data model

| Entity | Key fields | Relationships / notes |
|---|---|---|
| User | id, authProviderId, email, displayName, avatarUrl, timestamps | One internal record per authenticated identity. |
| Project | id, name, description, ownerId, status, timestamps | Has many memberships, sections, labels, tasks and activity events. |
| ProjectMembership | projectId, userId, role, status, invitedBy, timestamps | Unique per project/user; status is pending, active, declined or removed. |
| Section | id, projectId, name, position, timestamps | Ordered within a project. |
| Task | id, projectId nullable, sectionId nullable, parentTaskId nullable, title, description, priority, assigneeId nullable, scheduledFor nullable, status, position, completedAt, completedBy, timestamps | Parent and child must share project. Inbox tasks have no project/section/assignee. |
| Label | id, projectId, name, colour, timestamps | Scoped to one project. |
| TaskLabel | taskId, labelId | Many-to-many join; validates matching project scope. |
| Comment | id, taskId, authorId, body, createdAt, deletedAt | Soft delete preserves activity integrity. |
| ActivityEvent | id, projectId, taskId nullable, actorId, action, metadata, createdAt | Append-only audit/activity stream. |
| Invitation | id, projectId, email, role, tokenHash, status, expiresAt, invitedBy | Stores no reusable raw token. |

## 11. Non-functional requirements

| Area | Requirement |
|---|---|
| Security | Authenticate and authorise every server-side data operation; never trust client-provided user or role identifiers. Validate and constrain all inputs and returned data. |
| Privacy | Return only fields needed by the current screen. Do not expose project membership, comments or task metadata to non-members. |
| Accessibility | Meet WCAG 2.2 AA intent for keyboard operation, visible focus, semantic controls, sufficient colour contrast, screen-reader labels and non-colour-only task status. |
| Responsive design | Core workflows must work at 320 px mobile width and common desktop widths. No required action may depend only on hover, drag or a large pointer. |
| Performance | Initial authenticated project view should become useful within 2.5 seconds on a typical broadband connection; task interaction feedback should begin within 200 ms where network conditions permit. |
| Reliability | Persist mutations atomically where related records must agree (for example project + owner membership). Display recoverable errors and avoid silent loss of user input. |
| Time handling | Store timestamps in UTC; render planned dates/times in the user’s configured browser timezone for the MVP. Define date-only versus date-time behaviour explicitly in tests. |
| Observability | Record structured, privacy-safe errors for failed mutations and authentication/authorisation denials. |

## 12. Acceptance criteria for release

- A new user can sign up, create a project, invite an Editor, and see the Editor become active after acceptance.
- An Editor can create a task, assign it to an active member, add a comment and complete it.
- A Viewer can see the task and activity but cannot trigger or successfully submit edit, completion, assignment or comment mutations.
- A non-member cannot discover a project/task through a URL, search result, direct request or Server Action.
- Today and Upcoming correctly include only accessible incomplete tasks according to their planned date/time and timezone rule.
- Task completion and membership changes appear in the project activity feed with actor and timestamp.
- The core flows above are covered by automated tests, including negative permission tests.
- The release includes accessible empty, loading, error and permission-denied states.

## 13. Delivery sequence

| Milestone | Deliverable | Depends on |
|---|---|---|
| 0. Technical decisions | Chosen auth, database, deployment, email-invite and storage approach; security ownership documented | Product confirmation |
| 1. Foundation | Authenticated shell, user synchronisation, database migrations, data-access layer and role checks | Milestone 0 |
| 2. Shared projects | Project CRUD, membership/invitation flow, Owner/Editor/Viewer enforcement | Milestone 1 |
| 3. Shared work loop | Tasks, sections, labels, assignment, completion, task detail and comments | Milestone 2 |
| 4. Daily usability | Inbox, Today, Upcoming, project navigation, search and activity | Milestone 3 |
| 5. Release hardening | Accessibility, responsive QA, error recovery, security tests and monitoring | Milestone 4 |

## 14. Open decisions before implementation

These decisions are intentionally not invented by this PRD because they affect cost, external accounts and long-term architecture:

1. Authentication provider and sign-in methods (for example, email/password, magic link, Google, Microsoft).
2. Database and hosting provider, including backup/retention expectations.
3. Email delivery provider and invitation expiry/resent policy.
4. Whether Viewer access is required in the first release or should wait until after Editor collaboration works.
5. Whether Inbox tasks are strictly private or may later be converted into shared project tasks; this PRD assumes private until moved.
6. Product name, domain and user-facing privacy/terms copy.

## 15. Traceability to research

This PRD borrows the research report’s durable task primitives and intentionally excludes its ecosystem-level capabilities. In particular, it preserves the distinction between planned date and deadline, keeps one assignee per task, uses projects/sections/sub-tasks/labels/comments as core composition tools, and treats calendar sync, time tracking, AI, automation and formal project controls as later or external concerns.

The reference product is used only as a capability benchmark. This product must establish its own name, copy, visual identity, behaviour and implementation; it must not reproduce another product’s brand, proprietary assets or paid-entitlement model.
