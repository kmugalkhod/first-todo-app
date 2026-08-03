# Task 0301 — Task List Row + Resources

## Requirement

Render the Taskspace task row per `DESIGN.md`: compact paper rows with a completion control, title, priority pill, labels, due date and owner, plus citron ownership markers and coral attention for overdue. Hide secondary tags before obscuring the title/due/owner on narrow widths.

## Steps

1. Build the `TaskRow` component: completion circle/checkbox, title, priority pill (P1 coral, P2 warm yellow, P3 periwinkle, P4 cool gray), label chips (green-tinted category), planned date, and owner avatar.
2. Apply the selected-row treatment from the design (pale surface, panel rounding).
3. Make task status non-colour-only (completion control is a checkbox/diamond shape, not colour alone) — accessibility NFR.
4. Wire the row to the detail panel (Task 0305) — selecting shows the record without navigating away.
5. Show overdue with coral attention styling and clearly label it (priority vs deadline are distinct per the design).
6. Add the small "plus" affordance captured in the design for quick add within a section.

## Recommendation

Extract `TaskRow` as its own client component and reuse it across project view and the daily views (Story 04). Use the `cn` utility and design tokens from CSS variables. Keep rows flat (thin dividers, no raised cards) per the design's "Don't" guidance, reserving the logged-in surface treatment for the selected row.
