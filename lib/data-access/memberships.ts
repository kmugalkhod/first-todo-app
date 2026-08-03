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

/* ------------------------------------------------------------------ */
/*  Pending-invitation lifecycle (Task 0202)                           */
/*  Pending → active (accepted) / declined / removed are all           */
/*  distinguishable membership states (FR-2). The invitee manages      */
/*  their own pending membership; an owner can act on their behalf.    */
/* ------------------------------------------------------------------ */

/**
 * The invitee (or an owner acting for them) may manage a pending membership:
 * anyone may act on their own membership, and the owner has full control.
 */
async function assertCanManageMembership(
  actor: Actor,
  projectId: string,
  userId: string,
): Promise<void> {
  if (actor.id === userId) return;
  await assertPermission(actor, projectId, "member:invite");
}

/**
 * Add a user as a `pending` member (owner only). One membership per
 * project/user is enforced by the unique index (PRD §7): an active or pending
 * membership throws; a declined/removed membership is re-opened as pending so
 * an invite can be extended again without duplicating the row.
 */
export async function addPendingMembership(
  actor: Actor,
  projectId: string,
  userId: string,
  role: "editor" | "viewer",
): Promise<MemberDTO> {
  await assertPermission(actor, projectId, "member:invite");

  const existing = await findMembership(projectId, userId);
  if (existing) {
    if (existing.status === "active") {
      throw new ConflictError("That user is already a member of this project.");
    }
    if (existing.status === "pending") {
      throw new ConflictError("That user already has a pending invitation to this project.");
    }
    // declined / removed → re-invite so they show up as pending again.
    await db
      .update(projectMemberships)
      .set({ status: "pending", role, invitedBy: actor.id, updatedAt: new Date() })
      .where(eq(projectMemberships.id, existing.id));
  } else {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundError("That user does not exist.");

    await db.insert(projectMemberships).values({
      id: crypto.randomUUID(),
      projectId,
      userId,
      role,
      status: "pending",
      invitedBy: actor.id,
    });
  }

  await recordActivity({
    projectId,
    actorId: actor.id,
    action: "member_invited",
    metadata: { userId, role },
  });

  const created = await getMembershipDTO(projectId, userId);
  return created!;
}

/**
 * Activate a pending membership (invited member accepted). Can be run by the
 * invitee themselves or by an owner. Idempotent for an already-active member.
 */
export async function activateMembership(
  actor: Actor,
  projectId: string,
  userId: string,
): Promise<MemberDTO> {
  const membership = await findMembership(projectId, userId);
  if (!membership) throw new NotFoundError("That user is not a member of this project.");
  if (membership.status !== "pending") {
    if (membership.status === "active") return (await getMembershipDTO(projectId, userId))!;
    throw new ConflictError("Membership cannot be activated from its current status.");
  }

  await assertCanManageMembership(actor, projectId, userId);

  await db
    .update(projectMemberships)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(projectMemberships.id, membership.id));

  return (await getMembershipDTO(projectId, userId))!;
}

/**
 * Decline a pending membership (invited member declined the invite). The
 * invitee or an owner can decline; idempotent for an already-declined member.
 */
export async function declineMembership(
  actor: Actor,
  projectId: string,
  userId: string,
): Promise<MemberDTO> {
  const membership = await findMembership(projectId, userId);
  if (!membership) throw new NotFoundError("That user is not a member of this project.");
  if (membership.status === "declined") return (await getMembershipDTO(projectId, userId))!;
  if (membership.status !== "pending") {
    throw new ConflictError("Only a pending membership can be declined.");
  }

  await assertCanManageMembership(actor, projectId, userId);

  await db
    .update(projectMemberships)
    .set({ status: "declined", updatedAt: new Date() })
    .where(eq(projectMemberships.id, membership.id));

  return (await getMembershipDTO(projectId, userId))!;
}

/**
 * Member DTO for any membership state (not just active). Used to reflect the
 * pending/declined/removed states back to callers.
 */
async function getMembershipDTO(
  projectId: string,
  userId: string,
): Promise<MemberDTO | null> {
  const membership = await findMembership(projectId, userId);
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
