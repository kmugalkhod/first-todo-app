import "server-only";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { AppError, UnauthorizedError } from "@/lib/data-access/errors";
import { reportActionFailure } from "@/lib/observability";
import type { Actor } from "@/lib/data-access/types";

import type {
  ActionError,
  ActionErrorCode,
  ActionResult,
} from "./types";

/**
 * Server-only plumbing shared by every server action (Task 0103).
 *
 * This module must never be imported by client components: it pulls in
 * `getCurrentUser` (headers, auth, DB sync) and the DAO error hierarchy. That
 * hard boundary is enforced by the top-level `import "server-only"`.
 *
 * Two responsibilities:
 *
 * 1. `requireActor()` — derive the authenticated actor **from the session**
 *    (never from client-supplied ids), keying the authorisation model.
 * 2. `toActionResult(fn)` — run the (thin) action body and normalise *any*
 *    outcome into a serialisable `ActionResult<T>`, mapping the DAO's
 *    `AppError` codes onto the shared `ActionErrorCode` union so the UI can
 *    react to a code rather than reaching into the DB.
 */

/** Resolve the acting user from the session, or throw `UnauthorizedError`. */
export async function requireActor(): Promise<Actor> {
  const current = await getCurrentUser();
  if (!current?.user) {
    throw new UnauthorizedError("You must be signed in to do that.");
  }
  return { id: current.user.id, email: current.user.email };
}

/** Map a thrown DAO/domain error onto the shared, UI-safe error shape. */
function toActionError(err: unknown): ActionError {
  if (err instanceof AppError) {
    return {
      code: err.code as ActionErrorCode,
      message: err.message,
    };
  }
  return {
    code: "UNKNOWN",
    message: err instanceof Error ? err.message : "Something went wrong.",
  };
}

/**
 * Wrap a thin action body so success and failure are both returned as
 * `ActionResult<T>` instead of throwing opaque errors across the boundary.
 */
export async function toActionResult<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  const traceId = crypto.randomUUID();
  const startedAt = performance.now();
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    reportActionFailure(err, "server-action", traceId, Math.round(performance.now() - startedAt));
    return { ok: false, error: toActionError(err) };
  }
}
