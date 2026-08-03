/**
 * Shared server-action result types (Task 0103).
 *
 * This module is deliberately **client-safe**: it contains no server-only code,
 * no DB or auth imports, and no `"use server"` directive. Both server-action
 * modules and client components import these types so the UI can switch on a
 * stable machine-readable `code` and render recoverable, per-field errors while
 * preserving the user's input.
 *
 * Every server action returns `ActionResult<T>`:
 *
 *   { ok: true, data: <typed payload> }
 *   { ok: false, error: { code, message? } }
 *
 * Actions never throw across the boundary — unexpected errors are collapsed to
 * `{ code: "UNKNOWN" }` — so a failed mutation is always a normal return value
 * the UI can handle without an error boundary.
 */

/** Stable, machine-readable error codes shared with the data-access layer. */
export type ActionErrorCode =
  | "UNAUTHORIZED" // No/invalid session.
  | "FORBIDDEN" // Authenticated but not permitted.
  | "NOT_FOUND" // Resource absent or not visible.
  | "VALIDATION" // Client-supplied input failed server validation.
  | "CONFLICT" // Op conflicts with existing state (e.g. duplicate label).
  | "UNKNOWN"; // Unexpected / unclassified server error.

export type ActionError = {
  code: ActionErrorCode;
  /** Human-readable, safe-to-show message (or undefined for UNKNOWN). */
  message?: string;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

/** Narrow a result to its payload (throws if not ok) — checks `ok` first. */
export function hasSucceeded<T>(result: ActionResult<T>): result is { ok: true; data: T } {
  return result.ok === true;
}
