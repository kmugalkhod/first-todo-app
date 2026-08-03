# Task 0501 — Responsive QA

## Requirement

Core workflows must work at 320 px mobile width and common desktop widths; no required action may depend only on hover, drag or a large pointer (PRD §11 responsive NFR). The detail record becomes a bottom sheet on mobile per the design.

## Steps

1. Verify the shell, topbar and sidebar at 320 px (ensure persistent/collapsible sidebar handles it).
2. Verify the list → detail bottom-sheet behaviour on mobile retains list context (Task 0305).
3. Verify `TaskRow` collapses secondary tags before obscuring title/due/owner on narrow widths (design guidance).
4. Verify all required actions are reachable by tap/keyboard, not just hover/drag (responsive NFR).
5. Run a QA pass at 320, 390, 768, 1024, 1440 px across the core flows (create, complete, comment, move, search).
6. Fix layout overflow, touch-target size and stacking issues; log findings.

## Recommendation

Adopt a mobile-first approach in CSS for the app so 320 px is native rather than a shrink of desktop. Use the existing `use-mobile` hook and shadcn responsive primitives (Sidebar collapsible, Sheet for the mobile detail panel). Keep the completion control and primary actions large enough to tap reliably (≥ ~44px ideally). Regression-test the Today/Upcoming/project views at mobile width since those are the daily surfaces.
