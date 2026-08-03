import "server-only";

import { dbWrite } from "@/lib/db";

/** The transaction handle type exposed by `dbWrite.transaction(...)`. */
export type DbTransaction = Parameters<Parameters<typeof dbWrite.transaction>[0]>[0];

/**
 * Run a callback inside a single ACID transaction (reliability NFR). Used by
 * the data-access layer for any multi-record write that must commit or roll
 * back as one unit — e.g. "create project + owner membership" or "transfer
 * ownership + demote/promote memberships".
 *
 * Writes inside the callback must go through the provided `tx` handle so they
 * participate in the same transaction.
 */
export function transaction<T>(callback: (tx: DbTransaction) => Promise<T>): Promise<T> {
  return dbWrite.transaction(callback);
}
