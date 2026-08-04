# Taskspace observability runbook

Server-action and request failures are emitted as JSON with only a stable error
code, source, trace id, latency, and (when available) internal actor id. Never
add task text, email addresses, invitation tokens, or session data to these
events.

Watch the rate of `FORBIDDEN` and `UNAUTHORIZED` events: a sudden increase can
mean a broken permission rollout or an abuse attempt. Watch action latency
against the 200 ms feedback target and project renders against 2.5 seconds.

When an alert fires, filter first by `traceId` and `source`, confirm whether it
is a permission denial or an application error, then reproduce with a minimal
non-production account. Escalate repeated authentication failures and any
unexpected access denial to the security owner. The JSON seam is intentionally
provider-neutral; configure the deployment log drain or an OpenTelemetry/Sentry
adapter with these fields rather than forwarding raw application payloads.
