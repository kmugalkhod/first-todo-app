# Story 05 — Release Hardening

**Milestone:** M5 — Release hardening
**Depends on:** Story 04
**Goal:** Make the MVP production-safe: accessibility (WCAG 2.2 AA), responsive QA, error recovery, security tests and monitoring.

## Context

The PRD's non-functional requirements (§11) and release acceptance criteria (§12) are enforced here. The design already calls for accessible, responsive, recoverable states; this Story finishes and verifies them.

## In scope

- Accessibility: keyboard operation, visible focus, semantic controls, contrast, screen-reader labels, non-colour-only task status (WCAG 2.2 AA intent).
- Responsive: core workflows at 320 px mobile and common desktop widths; no action depends only on hover/drag/large pointer.
- Error recovery: loading, empty, error and permission-denied states; recoverable mutation errors; preserved input.
- Security tests: negative permission tests, non-member access, no server trust of client identifiers.
- Observability: structured privacy-safe error logging for failed mutations and auth/authorisation denials.

## Out of scope

- New product features.

## Acceptance

- All §12 release acceptance criteria pass, including negative permission tests.
- Empty/loading/error/permission-denied states exist and are accessible.
- Core flows verified at 320 px and desktop widths.

## Corresponding tasks

- [`./Task/0500-accessibility-audit-and-fixes.md`](./Task/0500-accessibility-audit-and-fixes.md)
- [`./Task/0501-responsive-qa.md`](./Task/0501-responsive-qa.md)
- [`./Task/0502-error-and-edge-state-polish.md`](./Task/0502-error-and-edge-state-polish.md)
- [`./Task/0503-security-and-permission-tests.md`](./Task/0503-security-and-permission-tests.md)
- [`./Task/0504-observability-and-monitoring.md`](./Task/0504-observability-and-monitoring.md)
