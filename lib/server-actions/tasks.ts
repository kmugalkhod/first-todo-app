"use server";

import {
  assignTask,
  completeTask,
  createInboxTask,
  createTask,
  deleteTask,
  moveTaskToProject,
  reopenTask,
  reorderTasks,
  setTaskLabels,
  updateTask,
  updateTaskDetails,
} from "@/lib/data-access";
import type {
  CreateTaskInput,
  TaskDTO,
  UpdateTaskDetailsInput,
  UpdateTaskInput,
} from "@/lib/data-access";

import { requireActor, toActionResult } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Task server actions (Task 0103).
 *
 * All task writes are editor/owner-gated. The task's owning project is resolved
 * from the database, then the actor's membership/role is re-checked inside the
 * DAO. Assignments (`assigneeId`) only ever reference an *active* project
 * member — the DAO validates that too, so a client cannot hand-roll an
 * assignee id that was never invited.
 */

/** Create a task in a project. */
export async function createTaskAction(
  projectId: string,
  input: CreateTaskInput,
): Promise<ActionResult<TaskDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    const task = await createTask(actor, projectId, input);
    return task;
  });
}

/** Create a private actor-owned Inbox task. */
export async function createInboxTaskAction(
  input: Pick<CreateTaskInput, "title" | "description" | "priority" | "scheduledFor">,
): Promise<ActionResult<TaskDTO>> {
  return toActionResult(async () => {
    const task = await createInboxTask(await requireActor(), input);
    return task;
  });
}

/** Update editable task fields (title, description, priority, scheduling, …). */
export async function updateTaskAction(
  taskId: string,
  input: UpdateTaskInput,
): Promise<ActionResult<TaskDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    const task = await updateTask(actor, taskId, input);
    return task;
  });
}

/** Save the complete project-task detail record atomically. */
export async function updateTaskDetailsAction(
  taskId: string,
  input: UpdateTaskDetailsInput,
): Promise<ActionResult<Awaited<ReturnType<typeof updateTaskDetails>>>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    return updateTaskDetails(actor, taskId, input);
  });
}

/** Move a task into a section / position within its project (reorder/move). */
export async function moveTaskAction(
  taskId: string,
  input: { sectionId?: string | null; position?: number },
): Promise<ActionResult<TaskDTO>> {
  return updateTaskAction(taskId, input);
}

/** Persist an accessible up/down (or drag) ordering for direct section tasks. */
export async function reorderTasksAction(
  projectId: string,
  sectionId: string | null,
  orderedIds: string[],
): Promise<ActionResult<null>> {
  return toActionResult(async () => {
    await reorderTasks(await requireActor(), projectId, sectionId, orderedIds);
    return null;
  });
}

/**
 * Move a task to another project — or to the Inbox (`destinationProjectId =
 * null`). The actor's role in the destination project is enforced server-side
 * (FR-3). Project-scoped section/parent/assignee fields are re-scoped/cleared.
 */
export async function moveTaskToProjectAction(
  taskId: string,
  destinationProjectId: string | null,
): Promise<ActionResult<TaskDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    const task = await moveTaskToProject(actor, taskId, destinationProjectId);
    return task;
  });
}

/** Complete a task, recording who and when. */
export async function completeTaskAction(
  taskId: string,
): Promise<ActionResult<TaskDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    const task = await completeTask(actor, taskId);
    return task;
  });
}

/** Reopen a completed task. */
export async function reopenTaskAction(
  taskId: string,
): Promise<ActionResult<TaskDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    const task = await reopenTask(actor, taskId);
    return task;
  });
}

/** Assign a task to an active member, or unassign with `null`. */
export async function assignTaskAction(
  taskId: string,
  assigneeId: string | null,
): Promise<ActionResult<TaskDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    const task = await assignTask(actor, taskId, assigneeId);
    return task;
  });
}

/** Replace a task's label set (all labels must belong to the task's project). */
export async function setTaskLabelsAction(
  taskId: string,
  labelIds: string[],
): Promise<ActionResult<{ labelIds: string[] }>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    const result = await setTaskLabels(actor, taskId, labelIds);
    return result;
  });
}

/** Delete a task (sub-tasks are un-parented via set-null FK). */
export async function deleteTaskAction(
  taskId: string,
): Promise<ActionResult<null>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    await deleteTask(actor, taskId);
    return null;
  });
}
