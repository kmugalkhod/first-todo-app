# Task 0503 — Security + Permission Tests

## Requirement

Cover the §12 release acceptance criteria with automated tests, including negative permission tests: non-members cannot discover/access via URL, search, direct request or Server Action; Viewers cannot perform mutations; removed members lose access immediately.

## Steps

1. Write negative permission tests for every Server Action: a non-member calling any action receives an error; a Viewer mutation returns permission-denied (Task 0204 matrix).
2. Test that a non-member cannot read a project/task/comment/activity via any query or direct URL (privacy NFR).
3. Test that search returns nothing for inaccessible projects (Task 0405).
4. Test that a removed/non-active member loses access on the next request (no cached role).
5. Test that assignment does not grant membership, and that inbox tasks are private until moved.
6. Test token safety: invitations reject reuse, expiry and mismatched email (Task 0203).
7. Test atomicity: project + owner membership and other multi-record writes roll back on failure.
8. Run the suite in CI on every PR.

## Recommendation

Implement tests at the data-access/server-action layer for speed and reliability (unit + integration against a test DB) rather than only end-to-end. Because all security flows funnel through the layer from Task 0102 and actions from Task 0103, those units are the right seam. Use per-test isolated memberships to avoid cross-test leaking. This is the §12 acceptance criterion owner.
