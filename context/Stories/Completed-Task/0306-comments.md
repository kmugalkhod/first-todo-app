# Task 0306 — Comments

## Requirement

Let Editors/Owners add comments on tasks and delete their own comments; Owners can moderate any comment (FR-6). Comments support plain text and links in the MVP (file uploads, audio, rich mentions deferred). Every comment shows author and timestamp (FR-6).

## Steps

1. Implement `addComment` (Editor+) storing `taskId`, `authorId`, `body`, `createdAt`.
2. Implement `deleteComment` — author can delete their own; Owner can delete any; use soft delete (`deletedAt`) to preserve activity integrity (PRD §10).
3. Render comments in the detail panel (Task 0305) with author and timestamp.
4. Support plain text + link rendering (render line breaks; autolink URLs) — no rich editor in MVP.
5. Comment input: accessible label, submit via action, optimistic insert with error recovery.
6. Record a comment activity event.

## Recommendation

Use a soft delete on `Comment` (set `deletedAt`) so the activity feed integrity holds, and filter deleted comments from the comment list. Render plain text with `<p>`/whitespace handling and a simple linkifier; do not add a rich text editor or mentions in the MVP (explicitly deferred). Keep the author + timestamp always visible per FR-6.
