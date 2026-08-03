# Task 0500 — Accessibility Audit + Fixes

## Requirement

Meet WCAG 2.2 AA intent across the app: keyboard operation, visible focus, semantic controls, sufficient colour contrast, screen-reader labels and non-colour-only task status (PRD §11 accessibility NFR; §12).

## Steps

1. Audit keyboard navigation for all core flows (create, complete, reorder, move, comment, search, dialogs, sheets).
2. Ensure visible focus everywhere (the design mandates coral `#ff765d` focus outline).
3. Verify semantic structure: headings, lists, buttons, `aria-label`s, dialog/sheet focus management.
4. Verify colour contrast for text on paper, cobalt nav, pills and pale surfaces; adjust token usage where needed.
5. Ensure task status is conveyed by more than colour (completion control shape/checkbox + text, not colour alone).
6. Rescue a11y with tools: run an automated scan (e.g. axe) and manual keyboard passes; fix findings.
7. Verify screen-reader labels and that avatars/emoji/`title` affordances have text equivalents.

## Recommendation

Enable the design's coral focus treatment everywhere and keep the non-colour-only completion controls introduced in Task 0301. Run `eslint-plugin-jsx-a11y` and an axe pass in CI. Because the design already calls for these treatments (focus outline, non-colour status, contrast), treat this Story as verification + fixes rather than a redesign. Target the §12 a11y release criteria and document any knowingly-anonymous-icon objects with `aria-hidden` + labels.
