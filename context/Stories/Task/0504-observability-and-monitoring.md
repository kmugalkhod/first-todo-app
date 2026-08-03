# Task 0504 — Observability + Monitoring

## Requirement

Record structured, privacy-safe errors for failed mutations and authentication/authorisation denials (PRD §11 observability NFR). Provide monitoring for the performance and reliability NFRs (auth project view < 2.5s; task feedback < 200 ms).

## Steps

1. Add structured, privacy-safe error logging: log error type, actor id (not PII), resource type and an error code/source; never log raw tokens, passwords or full user data.
2. Log explicit auth and authorisation-denial events (including permission-denied from the matrix) with a stable error code for alerting.
3. Add server-side trace/correlation ids to associate a client request with its server error.
4. Add baseline performance instrumentation (e.g. route render time, action latency) to check the <2.5s / <200ms NFRs.
5. Integrate a monitoring/error-tracking backend (e.g. Sentry) per the Task 0000 hosting decision; wire release tracking.
6. Add a runbook on how to read metrics and respond to denials/errors spikes.

## Recommendation

Route all errors through one logging helper that guarantees structured JSON and redaction, so no secret or user PII leaks. Record auth/authorisation denials as their own event type to make security monitoring actionable. Use the chosen framework's instrumentation API (Next.js supports instrument). Keep the privacy NFR firm — log actor/action/resource, not content.
