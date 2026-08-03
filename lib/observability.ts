import "server-only";

import { AppError } from "@/lib/data-access/errors";

type Event = {
  event: "taskspace.action" | "taskspace.request-error";
  outcome: "denied" | "error";
  code: string;
  source: string;
  traceId: string;
  actorId?: string;
  durationMs?: number;
};

/**
 * One privacy-safe logging seam. It deliberately accepts ids and stable error
 * codes only: request bodies, tokens, email addresses and task content never
 * reach monitoring output.
 */
export function reportEvent(event: Event): void {
  console.error(JSON.stringify(event));
}

export function reportActionFailure(
  error: unknown,
  source: string,
  traceId: string,
  durationMs: number,
  actorId?: string,
): void {
  const code = error instanceof AppError ? error.code : "UNKNOWN";
  reportEvent({
    event: "taskspace.action",
    outcome: code === "FORBIDDEN" || code === "UNAUTHORIZED" ? "denied" : "error",
    code,
    source,
    traceId,
    durationMs,
    actorId,
  });
}
