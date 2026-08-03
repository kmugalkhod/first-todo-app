import "server-only";

import { desc, eq } from "drizzle-orm";

import { activityEvents, db, users, activityActionEnum } from "@/lib/db";
import { assertProjectAccess } from "./access";
import type { Actor } from "./types";
import type { DbTransaction } from "./transaction";

export type ActivityAction = (typeof activityActionEnum.enumValues)[number];

export type NewActivityInput = {
  projectId: string;
  actorId: string;
  action: ActivityAction;
  taskId?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Append-only activity stream (PRD §7 "changes are attributable"). This is
 * called internally by the other DAOs from within their own mutations — it is
 * not a client-facing entry point and takes explicit ids rather than an actor.
 */
async function insertActivity<W>(
  target: W,
  input: NewActivityInput,
) {
  // `target` is either the HTTP `db` or a `DbTransaction`; both expose
  // `.insert(...).values(...)` with identical call shape.
  await (target as { insert: typeof db.insert })
    .insert(activityEvents)
    .values({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      taskId: input.taskId ?? null,
      actorId: input.actorId,
      action: input.action,
      metadata: input.metadata ?? null,
    });
}

/** Record a single activity event (non-transactional context). */
export async function recordActivity(input: NewActivityInput): Promise<void> {
  await insertActivity(db, input);
}

/** Record an activity event inside an existing `transaction()` callback. */
export async function recordActivityInTx(
  tx: DbTransaction,
  input: NewActivityInput,
): Promise<void> {
  await insertActivity(tx, input);
}

export type ActivityDTO = {
  id: string;
  projectId: string;
  taskId: string | null;
  action: ActivityAction;
  metadata: Record<string, unknown> | null;
  actor: { id: string; name: string | null } | null;
  createdAt: Date;
};

/**
 * List a project's activity, newest first, scoped to project members
 * (`project:view`). Non-members receive nothing.
 */
export async function listActivity(
  actor: Actor,
  projectId: string,
  opts?: { limit?: number },
): Promise<ActivityDTO[]> {
  await assertProjectAccess(actor, projectId);

  const rows = await db
    .select({
      id: activityEvents.id,
      projectId: activityEvents.projectId,
      taskId: activityEvents.taskId,
      action: activityEvents.action,
      metadata: activityEvents.metadata,
      createdAt: activityEvents.createdAt,
      actorId: activityEvents.actorId,
      actorName: users.displayName,
    })
    .from(activityEvents)
    .leftJoin(users, eq(users.id, activityEvents.actorId))
    .where(eq(activityEvents.projectId, projectId))
    .orderBy(desc(activityEvents.createdAt))
    .limit(opts?.limit ?? 100);

  return rows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    taskId: r.taskId,
    action: r.action,
    metadata: (r.metadata ?? null) as Record<string, unknown> | null,
    createdAt: r.createdAt,
    actor: r.actorId ? { id: r.actorId, name: r.actorName } : null,
  }));
}
