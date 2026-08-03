import "server-only";

import { and, asc, eq } from "drizzle-orm";

import {
  db,
  membershipStatusEnum,
  projectMemberships,
  projects,
  users,
} from "@/lib/db";
import {
  assertPermission,
  getActiveMembership,
  type MembershipRole,
} from "./access";
import { ConflictError, NotFoundError } from "./errors";
import { recordActivity } from "./activity";
import type { Actor } from "./types";

export type MembershipStatus = (typeof membershipStatusEnum.enumValues)[number];

export type MemberDTO = {
  membershipId: string;
  userId: string;
  name: string | null;
  email: string;
  role: MembershipRole;
  status: MembershipStatus;
  joinedAt: Date;
};

/**
 * Get the actor's membership in a project, or null when they are not an
 * active member (privacy NFR — non-members see nothing).
 */
export async function getMembership(
  actor: Actor,
  projectId: string,
): Promise<MemberDTO | null> {
  const membership = await getActiveMembership(actor, projectId);
  if (!membership) return null;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, membership.userId))
    .limit(1);
  if (!user) return null;
  return {
    membershipId: membership.id,
    userId: membership.userId,
    name: user.displayName,
    email: user.email,
    role: membership.role,
    status: membership.status,
    joinedAt: membership.createdAt,
  };
}

/**
 * List a project's members. Scoped to `project:view` — anyone who can view the
 * project can see the member roster; non-members get nothing.
 */
export async function listMembers(
  actor: Actor,
  projectId: string,
): Promise<MemberDTO[]> {
  await assertPermission(actor, projectId, "project:view");

  const rows = await db
    .select({
      membershipId: projectMemberships.id,
      userId: projectMemberships.userId,
      name: users.displayName,
      email: users.email,
      role: projectMemberships.role,
      status: projectMemberships.status,
      joinedAt: projectMemberships.createdAt,
    })
    .from(projectMemberships)
    .innerJoin(users, eq(users.id, projectMemberships.userId))
    .where(eq(projectMemberships.projectId, projectId))
    .orderBy(asc(projectMemberships.createdAt));

  return rows.map((r) => ({
    membershipId: r.membershipId,
    userId: r.userId,
    name: r.name,
    email: r.email,
    role: r.role,
    status: r.status,
    joinedAt: r.joinedAt,
  }));
}

/**
 * Find a specific membership row in a project (internal helper for the owner
 * management operations below).
 */
async function findMembership(projectId: string, userId: string) {
  const [membership] = await db
    .select()
    .from(projectMemberships)
    .where(
      and(
        eq(projectMemberships.projectId, projectId),
        eq(projectMemberships.userId, userId),
      ),
    )
    .limit(1);
  return membership ?? null;
}

/**
 * Change a member's role to Editor or Viewer (owner only). The owner's own
 * role can only change via `transferOwnership`.
 */
export async function changeMemberRole(
  actor: Actor,
  projectId: string,
  memberUserId: string,
  newRole: "editor" | "viewer",
): Promise<MemberDTO> {
  await assertPermission(actor, projectId, "member:role");

  const membership = await findMembership(projectId, memberUserId);
  if (!membership) throw new NotFoundError("That user is not a member of this project.");
  if (membership.role === "owner") {
    throw new ConflictError("Transfer ownership to change the owner's role.");
  }

  await db
    .update(projectMemberships)
    .set({ role: newRole, updatedAt: new Date() })
    .where(eq(projectMemberships.id, membership.id));

  await recordActivity({
    projectId,
    actorId: actor.id,
    action: "member_role_changed",
    metadata: { targetUserId: memberUserId, role: newRole },
  });

  const updated = await requireMember(projectId, memberUserId);
  return updated;
}

/**
 * Remove a member (owner only). The final owner may not be removed; ownership
 * must be transferred first.
 */
export async function removeMember(
  actor: Actor,
  projectId: string,
  memberUserId: string,
): Promise<void> {
  await assertPermission(actor, projectId, "member:remove");

  // Never allow removing the final owner.
  const [project] = await db
    .select({ ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) throw new NotFoundError("Project not found.");
  if (project.ownerId === memberUserId) {
    throw new ConflictError("Transfer ownership before removing the owner.");
  }

  const membership = await findMembership(projectId, memberUserId);
  if (!membership) throw new NotFoundError("That user is not a member of this project.");

  await db
    .update(projectMemberships)
    .set({ status: "removed", updatedAt: new Date() })
    .where(eq(projectMemberships.id, membership.id));

  await recordActivity({
    projectId,
    actorId: actor.id,
    action: "member_removed",
    metadata: { targetUserId: memberUserId },
  });
}

/** Throwing helper that returns a member DTO (used internally after a write). */
async function requireMember(
  projectId: string,
  userId: string,
): Promise<MemberDTO> {
  const member = await getMembershipForUser(projectId, userId);
  if (!member) throw new NotFoundError("Member not found.");
  return member;
}

async function getMembershipForUser(
  projectId: string,
  userId: string,
): Promise<MemberDTO | null> {
  const [membership] = await db
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
  if (!membership) return null;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;
  return {
    membershipId: membership.id,
    userId: membership.userId,
    name: user.displayName,
    email: user.email,
    role: membership.role,
    status: membership.status,
    joinedAt: membership.createdAt,
  };
}
