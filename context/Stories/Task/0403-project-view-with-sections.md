# Task 0403 — Project View with Sections

## Requirement

The project view shows active tasks grouped by section and can reveal completed tasks on demand (FR-5). It is the primary "shared workboard" surface paired with the selected-record detail panel (Task 0305).

## Steps

1. Render the project view: header (project title + members + manage), sections in order, and their active tasks.
2. Support task creation within a section (quick-add plus affordance).
3. Group tasks by section; support section actions (add/rename/reorder/remove) per Task 0302.
4. Provide "show completed" toggle to reveal completed tasks on demand, across or per section.
5. Support selecting a task to open the detail panel (desktop) / sheet (mobile) without leaving the view.
6. Add loading/empty/error states and respect the manual-order-then-date-then-priority default (Task 0404).

## Recommendation

This view is the product's flagship — stick closely to the Taskspace design (structured paper list, cobalt accents, flat rows, selected-record panel). Keep data server-fetched per project with optimistic updates on task actions. Ensure archived projects never surface here and Viewers see the read-only variant. Reuse `TaskRow` and the section components.
