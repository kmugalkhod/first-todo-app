# Stories — Taskspace Shared MVP

This folder translates the **Product Requirements Document** (`../product-requirements-document.md`) and the approved **design** (`../Final-design/taskspace-momentum-prototype.html` + `../../DESIGN.md`) into an ordered, implementable set of **Stories**. Each Story groups the user-level work needed to complete one milestone of the Shared MVP.

The work is broken into **Stories** (epics), and each Story is decomposed into **Tasks** defined as individual `Task.md` files under [`./Task/`](./Task/).

## How to read this folder

1. Start here.
2. Read the Story file for the milestone you are working on (`00-…` to `05-…`).
3. Open the corresponding `Task.md` files in `./Task/` and implement them in numeric order.
4. A task is **done** only when its *Requirement*, *Steps* and *Recommendation* are satisfied and the acceptance criteria in the PRD pass.

## Story map (derived from PRD §13 Delivery sequence)

| # | Story | PRD milestone | Status |
|---|---|---|---|
| 00 | Technical decisions | M0 — chosen auth, database, hosting, email, storage + security ownership | Not started |
| 01 | Foundation | M1 — authenticated shell, user sync, migrations, data-access layer, role checks | Not started |
| 02 | Shared projects | M2 — project CRUD, membership/invitation flow, Owner/Editor/Viewer enforcement | Not started |
| 03 | Shared work loop | M3 — tasks, sections, labels, assignment, completion, task detail, comments | Not started |
| 04 | Daily usability | M4 — Inbox, Today, Upcoming, project navigation, search, activity | Not started |
| 05 | Release hardening | M5 — accessibility, responsive QA, error recovery, security tests, monitoring | Not started |

## Task index

All individual tasks live in [`./Task/`](./Task/) as numbered `Task.md` files. The full index is maintained in [`./Task/README.md`](./Task/README.md).

## Design north star

Implementation of every Story must follow the **Taskspace** design tokens defined in `DESIGN.md`:

- Cobalt (`#3543d6`) navigation + paper (`#fbfbff`) work canvas.
- Citron (`#edff81`) = people & ownership; coral (`#ff765d`) = attention/overdue; green (`#3b8b69`) = completion only.
- Display face (Archivo Display) for titles only; Aptos system for metadata/body.
- Structured list with a persistent selected-record panel on desktop; bottom sheet on mobile.
- Priority pills: P1 coral, P2 warm yellow, P3 periwinkle, P4 cool gray.
