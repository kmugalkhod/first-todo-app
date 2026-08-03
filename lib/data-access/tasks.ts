import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import {
  db,
  sections,
  taskPriorityEnum,
  taskStatusEnum,
  tasks,
} from "@/lib/db";
import {
  assertActiveMember,
  assertPermission,
  assertProjectAccess,
  canAccessProject,
} from "./access";
import { ForbiddenError, NotFoundError, ValidationError } from "./errors";
import { recordActivity } from "./activity";
import type { Actor } from "./types";

export type TaskPriority = (typeof taskPriorityEnum.enumValues)[number];
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];

export type TaskDTO = {
  id: string;
  projectId: string | null;
  sectionId: string | null;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  assigneeId: string | null;
  scheduledFor: Date | null;
  status: TaskStatus;
  position: number;
  completedAt: Date | null;
  completedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toTaskDTO(row: typeof tasks.$inferSelect): TaskDTO {
  return {
    id: row.id,
    projectId: row.projectId,
    sectionId: row.sectionId,
    parentTaskId: row.parentTaskId,
    title: row.title,
    description: row.description,
    priority: row.priority,
    assigneeId: row.assigneeId,
    scheduledFor: row.scheduledFor,
    status: row.status,
    position: row.position,
    completedAt: row.completedAt,
    completedBy: row.completedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Load a task, requiring the actor holds `permission` on its project. Inbox
 * tasks (no project) are intentionally out of scope here — they are managed by
 * the Inbox feature (Task 0400).
 */
async function loadTaskWithPermission(
  actor: Actor,
  taskId: string,
  permission: Parameters<typeof assertPermission>[2],
) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task) throw new NotFoundError("Task not found.");
  if (!task.projectId) throw new ForbiddenError("This inbox task is not project-scoped.");
  await assertPermission(actor, task.projectId, permission);
  const projectId = task.projectId;
  return { task, projectId };
}

/** Validate that a section (when given) belongs to `projectId`. */
async function assertSectionInProject(sectionId: string, projectId: string) {
  const [section] = await db
    .select()
    .from(sections)
    .where(and(eq(sections.id, sectionId), eq(sections.projectId, projectId)))
    .limit(1);
  if (!section) throw new ValidationError("Section does not belong to this project.");
}

/** Validate that a parent task (when given) belongs to `projectId`. */
async function assertParentInProject(parentTaskId: string, projectId: string) {
  const [parent] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, parentTaskId), eq(tasks.projectId, projectId)))
    .limit(1);
  if (!parent) throw new ValidationError("Parent task is not in this project.");
}

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  sectionId?: string | null;
  parentTaskId?: string | null;
  priority?: TaskPriority | null;
  assigneeId?: string | null;
  scheduledFor?: Date | null;
  position?: number | null;
};

/** Create a task in a project (editor/owner). All inputs validated server-side. */
export async function createTask(
  actor: Actor,
  projectId: string,
  input: CreateTaskInput,
): Promise<TaskDTO> {
  await assertPermission(actor, projectId, "task:write");

  const title = input.title?.trim();
  if (!title) throw new ValidationError("Task title is required.");

  if (input.sectionId) await assertSectionInProject(input.sectionId, projectId);
  if (input.parentTaskId) await assertParentInProject(input.parentTaskId, projectId);
  if (input.assigneeId) await assertActiveMember(projectId, input.assigneeId);

  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(tasks).values({
    id,
    projectId,
    sectionId: input.sectionId ?? null,
    parentTaskId: input.parentTaskId ?? null,
    title,
    description: input.description ?? null,
    priority: input.priority ?? "p3",
    assigneeId: input.assigneeId ?? null,
    scheduledFor: input.scheduledFor ?? null,
    status: "active",
    position: input.position ?? 0,
    createdAt: now,
    updatedAt: now,
  });

  await recordActivity({
    projectId,
    actorId: actor.id,
    action: "task_created",
    taskId: id,
    metadata: { title, priority: input.priority ?? "p3" },
  });

  const [row] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return toTaskDTO(row);
}

/** Get a task, or null for non-members / non-existent tasks (privacy NFR). */
export async function getTask(actor: Actor, taskId: string): Promise<TaskDTO | null> {
  const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!row || !row.projectId) return null;
  if (!(await canAccessProject(actor, row.projectId))) return null;
  return toTaskDTO(row);
}

export type ListTasksOptions = {
  includeCompleted?: boolean;
  sectionId?: string | null;
};

/** List project tasks (project:view). Non-members receive nothing. */
export async function listTasksInProject(
  actor: Actor,
  projectId: string,
  opts?: ListTasksOptions,
): Promise<TaskDTO[]> {
  await assertProjectAccess(actor, projectId);

  const conditions = [eq(tasks.projectId, projectId)];
  if (opts?.includeCompleted !== true) {
    conditions.push(eq(tasks.status, "active"));
  }
  if (opts?.sectionId !== undefined) {
    conditions.push(
      opts.sectionId === null ? isNull(tasks.sectionId) : eq(tasks.sectionId, opts.sectionId),
    );
  }

  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.position), asc(tasks.createdAt));

  return rows.map(toTaskDTO);
}

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  sectionId?: string | null;
  parentTaskId?: string | null;
  priority?: TaskPriority;
  assigneeId?: string | null;
  scheduledFor?: Date | null;
  position?: number;
};

/** Update editable task fields (editor/owner). All inputs validated server-side. */
export async function updateTask(
  actor: Actor,
  taskId: string,
  input: UpdateTaskInput,
): Promise<TaskDTO> {
  const { projectId } = await loadTaskWithPermission(actor, taskId, "task:write");

  const patch: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() };

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new ValidationError("Task title is required.");
    patch.title = title;
  }
  if (input.description !== undefined) patch.description = input.description ?? null;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.scheduledFor !== undefined) patch.scheduledFor = input.scheduledFor ?? null;
  if (input.position !== undefined) patch.position = input.position;

  if (input.sectionId !== undefined) {
    if (input.sectionId) await assertSectionInProject(input.sectionId, projectId);
    patch.sectionId = input.sectionId ?? null;
  }
  if (input.parentTaskId !== undefined) {
    if (input.parentTaskId) await assertParentInProject(input.parentTaskId, projectId);
    patch.parentTaskId = input.parentTaskId ?? null;
  }
  if (input.assigneeId !== undefined) {
    if (input.assigneeId) await assertActiveMember(projectId, input.assigneeId);
    patch.assigneeId = input.assigneeId ?? null;
  }

  await db.update(tasks).set(patch).where(eq(tasks.id, taskId));

  const changed = Object.keys(patch).filter((k) => k !== "updatedAt");
  await recordActivity({
    projectId,
    actorId: actor.id,
    action: "task_updated",
    taskId,
    metadata: { changed },
  });

  const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return toTaskDTO(row);
}

/** Complete a task, recording who and when (editor/owner, PRD FR-4). */
export async function completeTask(actor: Actor, taskId: string): Promise<TaskDTO> {
  const { task, projectId } = await loadTaskWithPermission(actor, taskId, "task:write");
  if (task.status === "completed") return toTaskDTO(task);

  const now = new Date();
  await db
    .update(tasks)
    .set({ status: "completed", completedAt: now, completedBy: actor.id, updatedAt: now })
    .where(eq(tasks.id, taskId));
  await recordActivity({
    projectId,
    actorId: actor.id,
    action: "task_completed",
    taskId,
    metadata: { title: task.title },
  });

  const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return toTaskDTO(row);
}

/** Reopen a completed task (editor/owner, PRD FR-4 "completion is reversible"). */
export async function reopenTask(actor: Actor, taskId: string): Promise<TaskDTO> {
  const { task, projectId } = await loadTaskWithPermission(actor, taskId, "task:write");
  if (task.status === "active") return toTaskDTO(task);

  const now = new Date();
  await db
    .update(tasks)
    .set({ status: "active", completedAt: null, completedBy: null, updatedAt: now })
    .where(eq(tasks.id, taskId));
  await recordActivity({
    projectId,
    actorId: actor.id,
    action: "task_reopened",
    taskId,
    metadata: { title: task.title },
  });

  const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return toTaskDTO(row);
}

/** Assign a task to an active member, or unassign with `null` (editor/owner). */
export async function assignTask(
  actor: Actor,
  taskId: string,
  assigneeId: string | null,
): Promise<TaskDTO> {
  const { task, projectId } = await loadTaskWithPermission(actor, taskId, "task:assign");

  if (assigneeId) await assertActiveMember(projectId, assigneeId);

  const now = new Date();
  await db
    .update(tasks)
    .set({ assigneeId, updatedAt: now })
    .where(eq(tasks.id, taskId));

  await recordActivity({
    projectId,
    actorId: actor.id,
    action: assigneeId ? "task_assigned" : "task_unassigned",
    taskId,
    metadata: { assigneeId, title: task.title },
  });

  const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return toTaskDTO(row);
}

/** Delete a task (editor/owner). Sub-tasks are un-parented via set-null FK. */
export async function deleteTask(actor: Actor, taskId: string): Promise<void> {
  const { task, projectId } = await loadTaskWithPermission(actor, taskId, "task:delete");
  await db.delete(tasks).where(eq(tasks.id, taskId));
  await recordActivity({
    projectId,
    actorId: actor.id,
    action: "task_deleted",
    metadata: { title: task.title },
  });
}
