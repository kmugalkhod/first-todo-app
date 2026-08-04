import type { Instrumentation } from "next";

import { reportEvent } from "@/lib/observability";

/** Next 16 server error hook; only emits route metadata and an opaque digest. */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const digest = typeof error === "object" && error && "digest" in error
    ? String(error.digest)
    : "UNKNOWN";
  reportEvent({
    event: "taskspace.request-error",
    outcome: "error",
    code: digest,
    source: `${context.routeType}:${context.routePath}:${request.method}`,
    traceId: crypto.randomUUID(),
  });
};
