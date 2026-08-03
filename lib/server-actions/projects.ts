"use server";

import {
  archiveProject,
  createProject,
  getProject,
  listProjectsForActor,
  restoreProject,
  transferOwnership,
  updateProject,
} from "@/lib/data-access";
import type {
  CreateProjectInput,
  ProjectDTO,
  UpdateProjectInput,
} from "@/lib/data-access";

import { requireActor, toActionResult } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Project server actions (Task 0103).
 *
 * Each action is intentionally thin: resolve the actor from the session, hand
 * off to the data-access layer, and normalise the outcome into a typed,
 * serialisable `ActionResult`. The actor is always derived server-side from the
 * session — never from a client-supplied `userId` — and every write is
 * re-authorisation-checked inside the DAO before any data is touched.
 */

/**
 * List the actor's **active** projects (archived ones are hidden from active
 * views, PRD FR-2). Returns only projects where the actor is an active member.
 */
export async function listProjectsAction(): Promise<ActionResult<ProjectDTO[]>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    return listProjectsForActor(actor);
  });
}

/** Create a project; the caller becomes its owner (FR-2). */
export async function createProjectAction(
  input: CreateProjectInput,
): Promise<ActionResult<ProjectDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    return createProject(actor, input);
  });
}

/**
 * Fetch a single project by id (any active member can read it). Used by the
 * Members surface to display *which* project is being managed, making the
 * project scoping explicit rather than implicit.
 */
export async function getProjectAction(
  projectId: string,
): Promise<ActionResult<ProjectDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    const project = await getProject(actor, projectId);
    if (!project) throw new Error("Project not found.");
    return project;
  });
}

/** Rename / edit a project (owner only). */
export async function updateProjectAction(
  projectId: string,
  input: UpdateProjectInput,
): Promise<ActionResult<ProjectDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    return updateProject(actor, projectId, input);
  });
}

/** Archive a project (owner only). Data is preserved for restoration. */
export async function archiveProjectAction(
  projectId: string,
): Promise<ActionResult<ProjectDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    return archiveProject(actor, projectId);
  });
}

/** Restore an archived project (owner only). */
export async function restoreProjectAction(
  projectId: string,
): Promise<ActionResult<ProjectDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    return restoreProject(actor, projectId);
  });
}

/** Transfer ownership to another active member (owner only). */
export async function transferOwnershipAction(
  projectId: string,
  newOwnerUserId: string,
): Promise<ActionResult<ProjectDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    return transferOwnership(actor, projectId, newOwnerUserId);
  });
}
