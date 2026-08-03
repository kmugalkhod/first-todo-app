import "server-only";

import { and, asc, eq } from "drizzle-orm";

import {
  db,
  projectMemberships,
  projects,
  projectStatusEnum,
} from "@/lib/db";
import {
  assertPermission,
  getActiveMembership,
  type MembershipRole,
} from "./access";
import { ConflictError, ForbiddenError, ValidationError } from "./errors";
import { recordActivity, recordActivityInTx } from "./activity";
import { transaction } from "./transaction";
import type { Actor } from "./types";

export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];

export type ProjectDTO = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  /** The acting member's role, useful for the UI to gate actions. */
  myRole: MembershipRole;
  createdAt: Date;
  updatedAt: Date;
};

function toProjectDTO(
  row: typeof projects.$inferSelect,
  role: MembershipRole,
): ProjectDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    myRole: role,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Membership-scoped load: returns null for non-members (privacy NFR). */
async function loadProject(
  actor: Actor,
  projectId: string,
): Promise<{ project: typeof projects.$inferSelect; role: MembershipRole } | null> {
  const membership = await getActiveMembership(actor, projectId);
  if (!membership) return null;
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) return null;
  return { project, role: membership.role };
}

/** Throwing variant of `loadProject`. */
async function loadRequiredProject(actor: Actor, projectId: string) {
  const loaded = await loadProject(actor, projectId);
  if (!loaded) throw new ForbiddenError("You do not have access to this project.");
  return loaded;
}

export type CreateProjectInput = {
  name: string;
  description?: string | null;
};

/**
 * Create a project and its owner membership atomically (reliability NFR).
 * The creator becomes the owner (PRD FR-2).
 */
export async function createProject(
  actor: Actor,
  input: CreateProjectInput,
): Promise<ProjectDTO> {
  const name = input.name?.trim();
  if (!name) throw new ValidationError("Project name is required.");

  const id = crypto.randomUUID();

  await transaction(async (tx) => {
    await tx.insert(projects).values({
      id,
      name,
      description: input.description ?? null,
      ownerId: actor.id,
      status: "active",
    });
    await tx.insert(projectMemberships).values({
      id: crypto.randomUUID(),
      projectId: id,
      userId: actor.id,
      role: "owner",
      status: "active",
      invitedBy: actor.id,
    });
    await recordActivityInTx(tx, {
      projectId: id,
      actorId: actor.id,
      action: "project_created",
      metadata: { name },
    });
  });

  const loaded = await loadRequiredProject(actor, id);
  return toProjectDTO(loaded.project, loaded.role);
}

/** List projects the actor is an active member of, alphabetically. */
export async function listProjectsForActor(actor: Actor): Promise<ProjectDTO[]> {
  const rows = await db
    .select({
      project: projects,
      role: projectMemberships.role,
    })
    .from(projectMemberships)
    .innerJoin(projects, eq(projects.id, projectMemberships.projectId))
    .where(
      and(
        eq(projectMemberships.userId, actor.id),
        eq(projectMemberships.status, "active"),
      ),
    )
    .orderBy(asc(projects.name));

  return rows.map((r) => toProjectDTO(r.project, r.role));
}

/** Get a single project, or null for non-members / non-existent projects. */
export async function getProject(
  actor: Actor,
  projectId: string,
): Promise<ProjectDTO | null> {
  const loaded = await loadProject(actor, projectId);
  return loaded ? toProjectDTO(loaded.project, loaded.role) : null;
}

export type UpdateProjectInput = {
  name?: string;
  description?: string | null;
};

/** Rename / edit a project (owner only). */
export async function updateProject(
  actor: Actor,
  projectId: string,
  input: UpdateProjectInput,
): Promise<ProjectDTO> {
  await assertPermission(actor, projectId, "project:admin");

  const patch: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new ValidationError("Project name is required.");
    patch.name = name;
  }
  if (input.description !== undefined) {
    patch.description = input.description ?? null;
  }

  await db.update(projects).set(patch).where(eq(projects.id, projectId));

  const loaded = await loadRequiredProject(actor, projectId);
  return toProjectDTO(loaded.project, loaded.role);
}

/** Archive a project (owner only). Data is preserved for restoration (FR-2). */
export async function archiveProject(actor: Actor, projectId: string): Promise<ProjectDTO> {
  await assertPermission(actor, projectId, "project:admin");
  await db
    .update(projects)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(projects.id, projectId));
  await recordActivity({ projectId, actorId: actor.id, action: "project_archived" });

  const loaded = await loadRequiredProject(actor, projectId);
  return toProjectDTO(loaded.project, loaded.role);
}

/** Restore an archived project (owner only). */
export async function restoreProject(actor: Actor, projectId: string): Promise<ProjectDTO> {
  await assertPermission(actor, projectId, "project:admin");
  await db
    .update(projects)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(projects.id, projectId));
  await recordActivity({ projectId, actorId: actor.id, action: "project_restored" });

  const loaded = await loadRequiredProject(actor, projectId);
  return toProjectDTO(loaded.project, loaded.role);
}

/**
 * Transfer ownership to another active member (owner only). Atomic: the new
 * owner is promoted, the previous owner demoted to viewer (FR-2 "transfer
 * ownership").
 */
export async function transferOwnership(
  actor: Actor,
  projectId: string,
  newOwnerUserId: string,
): Promise<ProjectDTO> {
  await assertPermission(actor, projectId, "project:admin");
  const { project } = await loadRequiredProject(actor, projectId);

  if (project.ownerId !== actor.id) {
    throw new ForbiddenError("Only the current owner can transfer ownership.");
  }
  if (newOwnerUserId === actor.id) {
    throw new ConflictError("Ownership is already yours.");
  }

  const [member] = await db
    .select()
    .from(projectMemberships)
    .where(
      and(
        eq(projectMemberships.projectId, projectId),
        eq(projectMemberships.userId, newOwnerUserId),
        eq(projectMemberships.status, "active"),
      ),
    )
    .limit(1);
  if (!member) {
    throw new ValidationError("The new owner must be an active member of this project.");
  }

  await transaction(async (tx) => {
    await tx
      .update(projects)
      .set({ ownerId: newOwnerUserId, updatedAt: new Date() })
      .where(eq(projects.id, projectId));
    // Demote the outgoing owner unless they were already a non-owner.
    await tx
      .update(projectMemberships)
      .set({ role: "viewer", updatedAt: new Date() })
      .where(
        and(
          eq(projectMemberships.projectId, projectId),
          eq(projectMemberships.userId, actor.id),
        ),
      );
    await tx
      .update(projectMemberships)
      .set({ role: "owner", updatedAt: new Date() })
      .where(
        and(
          eq(projectMemberships.projectId, projectId),
          eq(projectMemberships.userId, newOwnerUserId),
        ),
      );
    await recordActivityInTx(tx, {
      projectId,
      actorId: actor.id,
      action: "member_role_changed",
      metadata: { targetUserId: newOwnerUserId, role: "owner" },
    });
  });

  const loaded = await loadRequiredProject(actor, projectId);
  return toProjectDTO(loaded.project, loaded.role);
}
