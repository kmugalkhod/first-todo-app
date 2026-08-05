import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db, labels, taskLabels, tasks } from "@/lib/db";
import { assertPermission, assertProjectAccess } from "./access";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "./errors";
import { recordActivity, recordActivityInTx } from "./activity";
import { transaction } from "./transaction";
import type { Actor } from "./types";

export type LabelDTO = {
  id: string;
  projectId: string;
  name: string;
  colour: string;
};

function toLabelDTO(row: typeof labels.$inferSelect): LabelDTO {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    colour: row.colour,
  };
}

/** Load a label and assert the actor holds `permission` on its project. */
async function loadLabelWithPermission(
  actor: Actor,
  labelId: string,
  permission: Parameters<typeof assertPermission>[2],
) {
  const [label] = await db
    .select()
    .from(labels)
    .where(eq(labels.id, labelId))
    .limit(1);
  if (!label) throw new NotFoundError("Label not found.");
  await assertPermission(actor, label.projectId, permission);
  return label;
}

/** Ensure a label name is unique within a project (labels are project-scoped). */
async function assertUniqueLabelName(projectId: string, name: string, ignoreId?: string) {
  const [existing] = await db
    .select()
    .from(labels)
    .where(and(eq(labels.projectId, projectId), eq(labels.name, name)))
    .limit(1);
  if (existing && existing.id !== ignoreId) {
    throw new ConflictError("A label with this name already exists in the project.");
  }
}

/** List a project's labels (project:view). */
export async function listLabelsInProject(
  actor: Actor,
  projectId: string,
): Promise<LabelDTO[]> {
  await assertProjectAccess(actor, projectId);
  const rows = await db
    .select()
    .from(labels)
    .where(eq(labels.projectId, projectId))
    .orderBy(asc(labels.name));
  return rows.map(toLabelDTO);
}

export type CreateLabelInput = {
  name: string;
  colour: string;
};

/** Create a project label (editor/owner). */
export async function createLabel(
  actor: Actor,
  projectId: string,
  input: CreateLabelInput,
): Promise<LabelDTO> {
  await assertPermission(actor, projectId, "label:write");

  const name = input.name?.trim();
  const colour = input.colour?.trim();
  if (!name) throw new ValidationError("Label name is required.");
  if (!colour) throw new ValidationError("Label colour is required.");

  await assertUniqueLabelName(projectId, name);

  const id = crypto.randomUUID();
  await db.insert(labels).values({ id, projectId, name, colour });
  await recordActivity({
    projectId,
    actorId: actor.id,
    action: "label_created",
    metadata: { name, colour },
  });

  const [row] = await db.select().from(labels).where(eq(labels.id, id)).limit(1);
  return toLabelDTO(row);
}

export type UpdateLabelInput = {
  name?: string;
  colour?: string;
};

/** Rename / recolour a project label (editor/owner). */
export async function updateLabel(
  actor: Actor,
  labelId: string,
  input: UpdateLabelInput,
): Promise<LabelDTO> {
  const label = await loadLabelWithPermission(actor, labelId, "label:write");

  const patch: Partial<typeof labels.$inferInsert> = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new ValidationError("Label name is required.");
    await assertUniqueLabelName(label.projectId, name, labelId);
    patch.name = name;
  }
  if (input.colour !== undefined) {
    const colour = input.colour.trim();
    if (!colour) throw new ValidationError("Label colour is required.");
    patch.colour = colour;
  }

  if (Object.keys(patch).length > 0) {
    await db.update(labels).set(patch).where(eq(labels.id, labelId));
    await recordActivity({
      projectId: label.projectId,
      actorId: actor.id,
      action: "label_renamed",
      metadata: { name: patch.name ?? label.name, colour: patch.colour ?? label.colour },
    });
  }

  const [row] = await db.select().from(labels).where(eq(labels.id, labelId)).limit(1);
  return toLabelDTO(row);
}

/** Delete a project label (editor/owner). Task-label joins cascade away. */
export async function deleteLabel(actor: Actor, labelId: string): Promise<void> {
  const label = await loadLabelWithPermission(actor, labelId, "label:write");
  await db.delete(labels).where(eq(labels.id, labelId));
  await recordActivity({
    projectId: label.projectId,
    actorId: actor.id,
    action: "label_deleted",
    metadata: { name: label.name },
  });
}

/**
 * Replace a task's label set atomically (editor/owner). All labels must belong
 * to the task's project (project-scope validation).
 */
export async function setTaskLabels(
  actor: Actor,
  taskId: string,
  labelIds: string[],
): Promise<{ labelIds: string[] }> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) throw new NotFoundError("Task not found.");
  if (!task.projectId) throw new ForbiddenError("This inbox task is not project-scoped.");
  const projectId = task.projectId;
  await assertPermission(actor, projectId, "task:write");

  const unique = [...new Set(labelIds)];

  if (unique.length > 0) {
    const rows = await db
      .select({ id: labels.id })
      .from(labels)
      .where(and(eq(labels.projectId, projectId), inArray(labels.id, unique)));
    if (rows.length !== unique.length) {
      throw new ValidationError("One or more labels do not belong to this project.");
    }
  }

  await transaction(async (tx) => {
    await tx.delete(taskLabels).where(eq(taskLabels.taskId, taskId));
    if (unique.length > 0) {
      await tx.insert(taskLabels).values(unique.map((labelId) => ({ taskId, labelId })));
    }
    await recordActivityInTx(tx, {
      projectId,
      actorId: actor.id,
      action: "task_updated",
      taskId,
      metadata: { labelsChanged: true },
    });
  });

  return { labelIds: unique };
}

/** List a task's label ids (project:view). */
export async function listTaskLabelIds(
  actor: Actor,
  taskId: string,
): Promise<string[]> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task || !task.projectId) return [];
  await assertProjectAccess(actor, task.projectId);

  const rows = await db
    .select({ labelId: taskLabels.labelId })
    .from(taskLabels)
    .where(eq(taskLabels.taskId, taskId));
  return rows.map((r) => r.labelId);
}

/**
 * List every task-label link in one membership-scoped query. Project views use
 * this instead of querying and authorising each task independently.
 */
export async function listTaskLabelIdsInProject(
  actor: Actor,
  projectId: string,
): Promise<Array<{ taskId: string; labelId: string }>> {
  await assertProjectAccess(actor, projectId);

  return db
    .select({ taskId: taskLabels.taskId, labelId: taskLabels.labelId })
    .from(taskLabels)
    .innerJoin(tasks, eq(tasks.id, taskLabels.taskId))
    .where(eq(tasks.projectId, projectId));
}
