# Task Index — Taskspace Shared MVP

Every task below is an individual `Task.md` file with three sections: **Requirement**, **Steps**, and **Recommendation**. Implement tasks in numeric order within their Story.

## Story 00 — Technical decisions

| Task | File |
|---|---|
| Decide host + database | [`0000-decision-host-and-database.md`](./0000-decision-host-and-database.md) |
| Decide auth provider | [`0001-decision-auth-provider.md`](./0001-decision-auth-provider.md) |
| Decide email + storage | [`0002-decision-email-and-storage.md`](./0002-decision-email-and-storage.md) |
| Write architecture decision record | [`0003-write-architecture-decision-record.md`](./0003-write-architecture-decision-record.md) |

## Story 01 — Foundation

| Task | File |
|---|---|
| Setup auth + user sync | [`0100-setup-auth-and-user-sync.md`](./0100-setup-auth-and-user-sync.md) |
| Create DB schema + migrations | [`0101-create-database-schema-and-migrations.md`](./0101-create-database-schema-and-migrations.md) |
| Build data-access layer | [`0102-build-data-access-layer.md`](./0102-build-data-access-layer.md) |
| Add server-action boundary | [`0103-add-server-action-boundary.md`](./0103-add-server-action-boundary.md) |
| Build authenticated shell + routing | [`0104-build-authenticated-shell-and-routing.md`](./0104-build-authenticated-shell-and-routing.md) |

## Story 02 — Shared projects

| Task | File |
|---|---|
| Project CRUD + data model | [`0200-project-crud-and-data-model.md`](./0200-project-crud-and-data-model.md) |
| Project list + creation UI | [`0201-project-list-and-creation-ui.md`](./0201-project-list-and-creation-ui.md) |
| Membership + invitation data model | [`0202-membership-and-invitation-data-model.md`](./0202-membership-and-invitation-data-model.md) |
| Invitation emails + acceptance | [`0203-invitation-emails-and-acceptance.md`](./0203-invitation-emails-and-acceptance.md) |
| Role permission matrix + enforcement | [`0204-role-permission-matrix-and-enforcement.md`](./0204-role-permission-matrix-and-enforcement.md) |
| Member management UI | [`0205-member-management-ui.md`](./0205-member-management-ui.md) |
| Project archive + manage UI | [`0206-project-archive-and-manage-ui.md`](./0206-project-archive-and-manage-ui.md) |

## Story 03 — Shared work loop

| Task | File |
|---|---|
| Task data model + CRUD | [`0300-task-data-model-and-crud.md`](./0300-task-data-model-and-crud.md) |
| Task list row + resources | [`0301-task-list-row-and-resources.md`](./0301-task-list-row-and-resources.md) |
| Sections + ordering | [`0302-sections-and-ordering.md`](./0302-sections-and-ordering.md) |
| Labels + priority | [`0303-labels-and-priority.md`](./0303-labels-and-priority.md) |
| Completion/reopen + sub-tasks | [`0304-completion-reopen-and-subtasks.md`](./0304-completion-reopen-and-subtasks.md) |
| Task detail panel | [`0305-task-detail-panel.md`](./0305-task-detail-panel.md) |
| Comments | [`0306-comments.md`](./0306-comments.md) |
| Assignment to members | [`0307-assignment-to-members.md`](./0307-assignment-to-members.md) |

## Story 04 — Daily usability

| Task | File |
|---|---|
| Inbox + "now" views | [`0400-inbox-and-now-views.md`](./0400-inbox-and-now-views.md) |
| Today view | [`0401-today-view.md`](./0401-today-view.md) |
| Upcoming view | [`0402-upcoming-view.md`](./0402-upcoming-view.md) |
| Project view with sections | [`0403-project-view-with-sections.md`](./0403-project-view-with-sections.md) |
| Ordering + sorting | [`0404-ordering-and-sorting.md`](./0404-ordering-and-sorting.md) |
| Search | [`0405-search.md`](./0405-search.md) |
| Activity feed | [`0406-activity-feed.md`](./0406-activity-feed.md) |

## Story 05 — Release hardening

| Task | File |
|---|---|
| Accessibility audit + fixes | [`0500-accessibility-audit-and-fixes.md`](./0500-accessibility-audit-and-fixes.md) |
| Responsive QA | [`0501-responsive-qa.md`](./0501-responsive-qa.md) |
| Error + edge-state polish | [`0502-error-and-edge-state-polish.md`](./0502-error-and-edge-state-polish.md) |
| Security + permission tests | [`0503-security-and-permission-tests.md`](./0503-security-and-permission-tests.md) |
| Observability + monitoring | [`0504-observability-and-monitoring.md`](./0504-observability-and-monitoring.md) |

## Template used for every task

```markdown
# Task <id> — <title>

## Requirement
<What must be true when this task is done — behaviour and acceptance criteria.>

## Steps
1. <Concrete technical implementation step>
2. ...

## Recommendation
<Implementation guidance, libraries, trade-offs and pitfalls to follow.>
```
