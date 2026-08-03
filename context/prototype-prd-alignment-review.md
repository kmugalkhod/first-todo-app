# Prototype and PRD alignment review

**Reviewed:** 2 August 2026  
**Inputs:** `context/product-requirements-document.md` and `prototypes/taskspace-momentum-prototype.html`  
**Decision:** Create a new **Shared MVP** product design. Reuse selected visual tokens and interaction ideas from the current prototype, but do not extend its information architecture as the primary application design.

## Executive verdict

The current Taskspace Momentum Board is a polished, responsive prototype for a **personal task-focus queue**. The PRD defines a **shared, project-based collaboration product** for small groups.

It is therefore not functionally aligned enough to evolve through small design improvements. The most important product concepts—projects, membership, roles, shared task context, comments and attributable activity—are absent from the prototype. Adding them around the existing "focus board" would make the core product difficult to understand.

The Focus board may be retained later as an optional personal planning view. It must not be the application’s primary navigation or primary product model for the Shared MVP.

## What is worth keeping

- The cobalt, citron and coral visual character, provided contrast is verified during implementation.
- Clear primary-task hierarchy and the restrained paper detail panel.
- Responsive layout behavior at desktop and mobile widths.
- Visible keyboard focus treatment, labelled controls and non-colour-only completion controls.
- Lightweight feedback for completion, deletion and undo.

## Functional alignment matrix

| PRD area | Status | Current prototype behavior | Required design direction |
|---|---|---|---|
| Authentication and account | Missing | No identity, sign-in or profile state. | Add signed-out, sign-in, account/profile and protected-app states. |
| Projects and membership | Missing | No projects, members, invitations or archive state. | Make project navigation, project creation, member management and invitations first-class. |
| Owner, Editor and Viewer roles | Missing | Every visible user can perform every task action. | Clearly communicate role capabilities; suppress/disable mutations for Viewers and restrict ownership controls. |
| Task creation | Partial | Requires a title and offers only fixed due-date choices. | Support Inbox, Today and project entry points; expose project, section, priority, labels, assignee and planned date/time. |
| Task detail | Missing | Detail only changes attention order, completes or deletes. | Use a persistent side panel or modal with description, metadata, subtasks, comments and activity. |
| Completion and reopening | Partial | A task can be toggled complete/open and undone locally. | Show completion actor/time and preserve reopen behavior. |
| Sub-tasks | Missing | Not represented. | Support visible hierarchy up to four levels, including unfinished child-work warnings. |
| Sections, labels and ordering | Missing | "Do now / Up next / Scheduled / Later" is a personal queue. | Use project sections and project-scoped labels; make manual sort behavior clear. |
| Today and Upcoming | Partial | Upcoming is a flat future filter; Focus board is not the PRD Today view. | Today must include incomplete scheduled-today and overdue tasks; Upcoming must group tasks by future date. |
| Project view | Missing | There is no project context. | Show active tasks by section, with completed tasks revealed on demand. |
| Assignment and comments | Missing | No members, assignee or comments. | Show one assignee selected from active members; support author/time-stamped comments. |
| Search and activity | Partial / Missing | Search filters titles only; no activity feed. | Search tasks, descriptions and project names within accessible projects; show attributable task and membership activity. |
| Persistence, authorisation and recovery | Missing | Task state is hard-coded client-side and resets on reload. | Design loading, error, permission-denied and preserved-input states around durable, role-checked server actions. |
| Responsive and accessibility | Partial | Desktop/mobile layouts, labelled controls and focus rings are present. | Validate keyboard, screen-reader, contrast and 320px workflows after new shared-product flows are designed. |

## Design direction for the replacement Shared MVP

### Primary application structure

1. **Global navigation:** Inbox, Today, Upcoming, Projects, Search and account menu.
2. **Project navigation:** Project list with active/archived separation; a selected project exposes sections and members.
3. **Main task list:** Tasks grouped by section with assignee, planned date, priority and label signals visible at a glance.
4. **Task detail surface:** Opens beside the current list rather than navigating away. It holds description, properties, subtasks, comments and activity.
5. **Role-aware project controls:** Owners manage members and archive; Editors manage work; Viewers have read-only presentation and clear explanation.

### Core screens and states to design before implementation

- Signed-out / sign-in entry.
- Empty Inbox, Today, Upcoming and Project states.
- Create project and invite member flow, including pending/accepted/declined invitations.
- Project view with sections, task creation and completed-task reveal.
- Task-detail panel for Owner/Editor and read-only Viewer variants.
- Search results across accessible projects/tasks.
- Activity feed.
- Loading, validation-error, recoverable mutation-error and permission-denied states.
- Mobile navigation and task-detail behavior at 320px width.

## Non-negotiable product rules to make visible in the design

- Every non-Inbox task belongs to exactly one project.
- A task has zero or one primary assignee—never multiple.
- Assignment does not grant project access.
- A planned date/time is not a deadline.
- Priority uses P1, P2, P3 and P4; P3 is the default.
- Completing a parent must not silently complete unfinished subtasks.
- Activity identifies the actor and timestamp without leaking inaccessible content.

## Recommendation for the current prototype

Do not discard its visual identity. Preserve the color system, strong focus treatment, compact task rows, responsive patterns and undo feedback as ingredients for the new design.

However, replace its personal "horizon" and attention-slot information architecture. The next design should begin with projects, members and shared task context, then decide whether a distilled Focus board belongs as an optional personal view after the Shared MVP flows are coherent.

## Reference implementation evidence

The prototype currently contains only hard-coded in-memory tasks and client-side actions for add, complete/reopen, delete/undo, attention slot changes, list filtering and title search. It contains no persistence, authentication, projects, membership, role validation, comments, activity or project-aware task metadata.

