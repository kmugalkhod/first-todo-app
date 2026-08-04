import "server-only";

import { and, asc, eq, gte, ilike, inArray, isNull, lt, or } from "drizzle-orm";

import {
  db,
  projectMemberships,
  projects,
  sections,
  taskLabels,
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
import { recordActivityInTx } from "./activity";
import { transaction } from "./transaction";
import type { Actor } from "./types";

export type TaskPriority = (typeof taskPriorityEnum.enumValues)[number];
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];

export type TaskDTO = {
  id: string;
  projectId: string | null;
  sectionId: string | null;
  createdBy: string | null;
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
    createdBy: row.createdBy,
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
 * Load a task for a write. Project tasks need the requested project permission;
 * private Inbox tasks belong exclusively to their creator.
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
  if (!task.projectId) {
    if (task.createdBy !== actor.id) throw new ForbiddenError("You do not have access to this inbox task.");
    return { task, projectId: null };
  }
  await assertPermission(actor, task.projectId, permission);
  const projectId: string | null = task.projectId;
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
async function assertParentInProject(parentTaskId: string, projectId: string, taskId?: string) {
  const [parent] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, parentTaskId), eq(tasks.projectId, projectId)))
    .limit(1);
  if (!parent) throw new ValidationError("Parent task is not in this project.");
  if (parent.id === taskId) throw new ValidationError("A task cannot be its own parent.");
  let depth = 1;
  let cursor = parent;
  const seen = new Set<string>(taskId ? [taskId] : []);
  while (cursor.parentTaskId) {
    if (seen.has(cursor.id)) throw new ValidationError("Task hierarchy cannot contain a cycle.");
    seen.add(cursor.id);
    const [next] = await db.select().from(tasks).where(eq(tasks.id, cursor.parentTaskId)).limit(1);
    if (!next || next.projectId !== projectId) throw new ValidationError("Parent task is not in this project.");
    cursor = next;
    depth += 1;
  }
  if (depth >= 4) throw new ValidationError("Sub-tasks can be nested at most four levels deep.");
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

/** A private, actor-owned Inbox task. Inbox has no synthetic project. */
export async function createInboxTask(
  actor: Actor,
  input: Pick<CreateTaskInput, "title" | "description" | "priority" | "scheduledFor">,
): Promise<TaskDTO> {
  const title = input.title?.trim();
  if (!title) throw new ValidationError("Task title is required.");
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(tasks).values({
    id,
    createdBy: actor.id,
    projectId: null,
    title,
    description: input.description ?? null,
    priority: input.priority ?? "p3",
    scheduledFor: input.scheduledFor ?? null,
    status: "active",
    position: 0,
    createdAt: now,
    updatedAt: now,
  });
  const [row] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return toTaskDTO(row);
}

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

  await transaction(async (tx) => {
    await tx.insert(tasks).values({
      id,
      createdBy: actor.id,
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

    // The insert and its attributable activity event commit together (principle 7).
    await recordActivityInTx(tx, {
      projectId,
      actorId: actor.id,
      action: "task_created",
      taskId: id,
      metadata: { title, priority: input.priority ?? "p3" },
    });
  });

  const [row] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return toTaskDTO(row);
}

/** Get a task, or null for non-members / non-existent tasks (privacy NFR). */
export async function getTask(actor: Actor, taskId: string): Promise<TaskDTO | null> {
  const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!row) return null;
  if (!row.projectId) return row.createdBy === actor.id ? toTaskDTO(row) : null;
  if (!(await canAccessProject(actor, row.projectId))) return null;
  return toTaskDTO(row);
}

/** List the actor's private Inbox. No membership row can expose these tasks. */
export async function listInboxTasks(actor: Actor, opts?: { includeCompleted?: boolean }) {
  const conditions = [isNull(tasks.projectId), eq(tasks.createdBy, actor.id)];
  if (opts?.includeCompleted !== true) conditions.push(eq(tasks.status, "active"));
  const rows = await db.select().from(tasks).where(and(...conditions)).orderBy(asc(tasks.position), asc(tasks.createdAt));
  return rows.map(toTaskDTO);
}

export type AccessibleTaskScope = "today" | "upcoming" | "all";

/**
 * Tasks visible to the actor across active memberships plus their Inbox.
 * Scope is applied in SQL with the membership predicate — never after fetch.
 */
export async function listAccessibleTasks(
  actor: Actor,
  opts: { scope?: AccessibleTaskScope; start?: Date; end?: Date; includeCompleted?: boolean } = {},
): Promise<TaskDTO[]> {
  const membershipTaskIds = db
    .select({ id: projectMemberships.projectId })
    .from(projectMemberships)
    .innerJoin(projects, eq(projects.id, projectMemberships.projectId))
    .where(and(eq(projectMemberships.userId, actor.id), eq(projectMemberships.status, "active"), eq(projects.status, "active")));
  const visibility = or(inArray(tasks.projectId, membershipTaskIds), and(isNull(tasks.projectId), eq(tasks.createdBy, actor.id)));
  const conditions = [visibility];
  if (opts.includeCompleted !== true) conditions.push(eq(tasks.status, "active"));
  if (opts.scope === "upcoming" && opts.end) conditions.push(gte(tasks.scheduledFor, opts.end));
  if (opts.scope === "today" && opts.start && opts.end) {
    conditions.push(or(and(gte(tasks.scheduledFor, opts.start), lt(tasks.scheduledFor, opts.end)), lt(tasks.scheduledFor, opts.start)));
  }
  const rows = await db.select().from(tasks).where(and(...conditions)).orderBy(asc(tasks.position), asc(tasks.scheduledFor), asc(tasks.priority), asc(tasks.createdAt));
  return rows.map(toTaskDTO);
}

export type SearchResult = { projects: Array<{ id: string; name: string }>; tasks: TaskDTO[] };

/** Privacy-scoped server-side search across active projects, tasks and Inbox. */
export async function searchAccessibleWork(actor: Actor, query: string): Promise<SearchResult> {
  const needle = query.trim();
  if (!needle) return { projects: [], tasks: [] };
  const projectIds = db
    .select({ id: projectMemberships.projectId })
    .from(projectMemberships)
    .innerJoin(projects, eq(projects.id, projectMemberships.projectId))
    .where(and(eq(projectMemberships.userId, actor.id), eq(projectMemberships.status, "active"), eq(projects.status, "active")));
  const projectRows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(inArray(projects.id, projectIds), eq(projects.status, "active"), ilike(projects.name, `%${needle}%`)));
  // Task title/description only; query scope is memberships + the actor's Inbox.
  const taskRows = await db.select().from(tasks).where(and(
    or(inArray(tasks.projectId, projectIds), and(isNull(tasks.projectId), eq(tasks.createdBy, actor.id))),
    or(ilike(tasks.title, `%${needle}%`), ilike(tasks.description, `%${needle}%`)),
  )).orderBy(asc(tasks.position), asc(tasks.createdAt));
  return { projects: projectRows.map((row) => ({ id: row.id, name: row.name })), tasks: taskRows.map(toTaskDTO) };
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

  if (!projectId && (input.sectionId !== undefined || input.parentTaskId !== undefined || input.assigneeId !== undefined)) {
    throw new ValidationError("Move this Inbox task into a project before setting project properties.");
  }
  const scopedProjectId = projectId;

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new ValidationError("Task title is required.");
    patch.title = title;
  }
  if (input.description !== undefined) patch.description = input.description ?? null;
  if (input.priority !== undefined) {
    if (!taskPriorityEnum.enumValues.includes(input.priority)) throw new ValidationError("Priority must be P1, P2, P3, or P4.");
    patch.priority = input.priority;
  }
  if (input.scheduledFor !== undefined) patch.scheduledFor = input.scheduledFor ?? null;
  if (input.position !== undefined) patch.position = input.position;

  if (input.sectionId !== undefined) {
    if (input.sectionId && scopedProjectId) await assertSectionInProject(input.sectionId, scopedProjectId);
    patch.sectionId = input.sectionId ?? null;
  }
  if (input.parentTaskId !== undefined) {
    if (input.parentTaskId && scopedProjectId) await assertParentInProject(input.parentTaskId, scopedProjectId, taskId);
    patch.parentTaskId = input.parentTaskId ?? null;
  }
  if (input.assigneeId !== undefined) {
    if (input.assigneeId && scopedProjectId) await assertActiveMember(scopedProjectId, input.assigneeId);
    patch.assigneeId = input.assigneeId ?? null;
  }

  const changed = Object.keys(patch).filter((k) => k !== "updatedAt");
  await transaction(async (tx) => {
    await tx.update(tasks).set(patch).where(eq(tasks.id, taskId));
    if (projectId) {
      await recordActivityInTx(tx, {
        projectId,
        actorId: actor.id,
        action: "task_updated",
        taskId,
        metadata: { changed },
      });
    }
  });

  const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return toTaskDTO(row);
}

/** Reorder a section's direct tasks in one dense, deterministic transaction. */
export async function reorderTasks(
  actor: Actor,
  projectId: string,
  sectionId: string | null,
  orderedIds: string[],
): Promise<void> {
  await assertPermission(actor, projectId, "task:write");
  const scope = and(eq(tasks.projectId, projectId), sectionId ? eq(tasks.sectionId, sectionId) : isNull(tasks.sectionId));
  const rows = await db.select({ id: tasks.id }).from(tasks).where(scope).orderBy(asc(tasks.position), asc(tasks.createdAt));
  const expected = new Set(rows.map((row) => row.id));
  if (orderedIds.length !== expected.size || new Set(orderedIds).size !== orderedIds.length || orderedIds.some((id) => !expected.has(id))) {
    throw new ValidationError("Task order must include every task in the section exactly once.");
  }
  const now = new Date();
  await transaction(async (tx) => {
    for (const [position, id] of orderedIds.entries()) {
      await tx.update(tasks).set({ position, updatedAt: now }).where(eq(tasks.id, id));
    }
    await recordActivityInTx(tx, { projectId, actorId: actor.id, action: "task_updated", metadata: { reordered: true, sectionId } });
  });
}

/** Complete a task, recording who and when (editor/owner, PRD FR-4). */
export async function completeTask(actor: Actor, taskId: string): Promise<TaskDTO> {
  const { task, projectId } = await loadTaskWithPermission(actor, taskId, "task:write");
  if (task.status === "completed") return toTaskDTO(task);

  const now = new Date();
  await transaction(async (tx) => {
    await tx
      .update(tasks)
      .set({ status: "completed", completedAt: now, completedBy: actor.id, updatedAt: now })
      .where(eq(tasks.id, taskId));
    if (projectId) await recordActivityInTx(tx, {
      projectId, actorId: actor.id, action: "task_completed", taskId, metadata: { title: task.title },
    });
  });

  const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return toTaskDTO(row);
}

/** Reopen a completed task (editor/owner, PRD FR-4 "completion is reversible"). */
export async function reopenTask(actor: Actor, taskId: string): Promise<TaskDTO> {
  const { task, projectId } = await loadTaskWithPermission(actor, taskId, "task:write");
  if (task.status === "active") return toTaskDTO(task);

  const now = new Date();
  await transaction(async (tx) => {
    await tx
      .update(tasks)
      .set({ status: "active", completedAt: null, completedBy: null, updatedAt: now })
      .where(eq(tasks.id, taskId));
    if (projectId) await recordActivityInTx(tx, {
      projectId, actorId: actor.id, action: "task_reopened", taskId, metadata: { title: task.title },
    });
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

  if (!projectId) throw new ForbiddenError("Inbox tasks cannot be assigned until they are moved to a project.");

  if (assigneeId) await assertActiveMember(projectId, assigneeId);

  const now = new Date();
  await transaction(async (tx) => {
    await tx
      .update(tasks)
      .set({ assigneeId, updatedAt: now })
      .where(eq(tasks.id, taskId));
    await recordActivityInTx(tx, {
      projectId,
      actorId: actor.id,
      action: assigneeId ? "task_assigned" : "task_unassigned",
      taskId,
      metadata: { assigneeId, title: task.title },
    });
  });

  const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return toTaskDTO(row);
}

/** Delete a task (editor/owner). Sub-tasks are un-parented via set-null FK. */
export async function deleteTask(actor: Actor, taskId: string): Promise<void> {
  const { task, projectId } = await loadTaskWithPermission(actor, taskId, "task:delete");
  await transaction(async (tx) => {
    await tx.delete(tasks).where(eq(tasks.id, taskId));
    // Attribute the deletion to the project it was removed from (taskId is
    // dropped because the row no longer exists, but the event survives).
    if (projectId) await recordActivityInTx(tx, {
      projectId, actorId: actor.id, action: "task_deleted", metadata: { title: task.title },
    });
  });
}

/** Load a task row without project-scope restrictions (used for cross-project moves). */
async function loadAnyTask(taskId: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) throw new NotFoundError("Task not found.");
  return task;
}

/**
 * Collect every descendant of `taskId` in breadth-first order (parents before
 * their children) so a subtree can be re-scoped in dependency order.
 */
async function collectSubtree(taskId: string): Promise<Array<typeof tasks.$inferSelect>> {
  const rows: Array<typeof tasks.$inferSelect> = [];
  const queue: string[] = [taskId];
  while (queue.length) {
    const parentId = queue.shift()!;
    const children = await db.select().from(tasks).where(eq(tasks.parentTaskId, parentId));
    for (const child of children) {
      rows.push(child);
      queue.push(child.id);
    }
  }
  return rows;
}

/** Non-throwing active-membership check (assignee re-scoping on cross-project moves). */
async function isActiveMember(projectId: string, userId: string): Promise<boolean> {
  const [m] = await db
    .select()
    .from(projectMemberships)
    .where(
      and(
        eq(projectMemberships.projectId, projectId),
        eq(projectMemberships.userId, userId),
        eq(projectMemberships.status, "active"),
      ),
    )
    .limit(1);
  return !!m;
}

/**
 * Move a task between projects — or into the Inbox (`projectId = null`, FR-3).
 *
 * Moving into a project checks the actor's role **in that destination project**
 * (FR-3: "moving one to a project checks the actor's project role"); moving out
 * of a project also requires `task:write` in the source. Project-scoped fields
 * (section, parent, assignee) are re-scoped or cleared so a task never reaches a
 * project through a section/parent/assignee from another project (FR-4/§7
 * non-negotiables), and the whole sub-task subtree moves together so every
 * descendant stays in the same project as its parent (FR-4). A sub-task that
 * still has a parent cannot change project — that would split it from its
 * parent (re-parenting within a project is handled by `updateTask`).
 * Persisted atomically (the move + re-scopes + activity event all commit or
 * roll back together — principle 7).
 */
export async function moveTaskToProject(
  actor: Actor,
  taskId: string,
  destinationProjectId: string | null,
): Promise<TaskDTO> {
  const task = await loadAnyTask(taskId);
  const sourceProjectId = task.projectId;

  // FR-4: a sub-task must stay in its parent's project. Moveable tasks are
  // roots — they have no parent that would be left behind in another project.
  if (task.parentTaskId && destinationProjectId !== sourceProjectId) {
    throw new ValidationError("A sub-task must stay in the same project as its parent.");
  }

  // Destination-role check is the FR-3 requirement; also guard the source so a
  // task can't be yanked out of a project the actor can't write.
  if (destinationProjectId) {
    await assertPermission(actor, destinationProjectId, "task:write");
  }
  if (sourceProjectId && sourceProjectId !== destinationProjectId) {
    await assertPermission(actor, sourceProjectId, "task:write");
  }

  // Same-project is not a project move; nothing to change.
  if (sourceProjectId === destinationProjectId) {
    const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    return toTaskDTO(row);
  }

  // Descendants follow the root so the whole subtree stays in one project.
  const subtree = await collectSubtree(taskId);
  const now = new Date();

  // Re-scope an assignee only when they are an active member of the destination
  // (assignment never implies membership — principle 8). Inbox tasks can never
  // carry an assignee, and project-scoped assignees never cross projects.
  const keepAssignee = async (assigneeId: string | null): Promise<boolean> =>
    !!destinationProjectId &&
    !!assigneeId &&
    (await isActiveMember(destinationProjectId, assigneeId));

  await transaction(async (tx) => {
    // Labels are project-scoped (FR-4/§7) — they never cross projects, so detach
    // them for the root and every descendant on a cross-project move.
    await tx.delete(taskLabels).where(eq(taskLabels.taskId, taskId));
    for (const child of subtree) {
      await tx.delete(taskLabels).where(eq(taskLabels.taskId, child.id));
    }

    // Root first, then children — each is its own statement, so a child's row
    // trigger sees its (already moved) parent in the new project.
    await tx
      .update(tasks)
      .set({
        projectId: destinationProjectId,
        sectionId: null,
        parentTaskId: null,
        assigneeId: (await keepAssignee(task.assigneeId)) ? task.assigneeId : null,
        updatedAt: now,
      })
      .where(eq(tasks.id, taskId));

    for (const child of subtree) {
      await tx
        .update(tasks)
        .set({
          projectId: destinationProjectId,
          sectionId: null,
          assigneeId: (await keepAssignee(child.assigneeId)) ? child.assigneeId : null,
          updatedAt: now,
        })
        .where(eq(tasks.id, child.id));
    }

    // Attribute the change to the project it happened in (destination, else source
    // when yielding a task to the Inbox).
    const activityProjectId = destinationProjectId ?? sourceProjectId;
    if (activityProjectId) {
      await recordActivityInTx(tx, {
        projectId: activityProjectId,
        actorId: actor.id,
        action: "task_updated",
        taskId,
        metadata: {
          title: task.title,
          movedFromProjectId: sourceProjectId,
          movedToProjectId: destinationProjectId,
          migratedSubtaskCount: subtree.length,
        },
      });
    }
  });

  const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return toTaskDTO(row);
}
