import "server-only";

import { and, eq } from "drizzle-orm";

import {
  db,
  membershipRoleEnum,
  projectMemberships,
} from "@/lib/db";
import {
  PERMISSIONS,
  type MembershipRole,
  type Permission,
  roleCan,
} from "@/lib/permissions";
import { ConflictError, ForbiddenError } from "./errors";
import type { Actor } from "./types";

export type Membership = typeof projectMemberships.$inferSelect;

export {
  PERMISSIONS,
  ROLE_LEVEL,
  ROLES,
  roleCan,
  permissionsForRole,
} from "@/lib/permissions";
export type { MembershipRole, Permission } from "@/lib/permissions";

// Keep a db-backed alias so the DAO barrel's `MembershipRole` matches the
// schema enum at the type level (they are structurally identical unions).
export type MembershipRoleDb = (typeof membershipRoleEnum.enumValues)[number];

/**
 * Return the actor's **active** membership in a project, or `null`. This is
 * the basis for every membership-scoped read — a non-member never sees even a
 * partial row (privacy NFR). Called on every request (never cached), so a
 * removed/deactivated member loses access immediately, including existing
 * sessions (PRD §7, Task 0204 step 5).
 */
export async function getActiveMembership(
  actor: Actor,
  projectId: string,
): Promise<Membership | null> {
  const [membership] = await db
    .select()
    .from(projectMemberships)
    .where(
      and(
        eq(projectMemberships.projectId, projectId),
        eq(projectMemberships.userId, actor.id),
        eq(projectMemberships.status, "active"),
      ),
    )
    .limit(1);

  return membership ?? null;
}

/** True if the membership's role is one of `roles`. */
export function hasRole(
  membership: Membership,
  ...roles: readonly MembershipRole[]
): boolean {
  return roles.includes(membership.role);
}

/**
 * Non-throwing permission guard — the shared `can(actor, projectId,
 * permission)` asked for in Task 0204. Returns whether `actor` may perform
 * `permission` on `projectId`. Membership is re-queried on every call.
 * Used by read paths and to derive UI affordances; the throwing equivalent
 * (`assertPermission`) is what mutations use.
 */
export async function can(
  actor: Actor,
  projectId: string,
  permission: Permission,
): Promise<boolean> {
  const membership = await getActiveMembership(actor, projectId);
  return membership ? roleCan(membership.role, permission) : false;
}

/**
 * Assert the actor has an active membership in `projectId` (throws
 * `ForbiddenError` otherwise) and return it.
 */
export async function assertProjectAccess(
  actor: Actor,
  projectId: string,
): Promise<Membership> {
  const membership = await getActiveMembership(actor, projectId);
  if (!membership) {
    throw new ForbiddenError("You do not have access to this project.");
  }
  return membership;
}

/**
 * Assert the actor has the given permission on `projectId` and return the
 * membership. The single-authority check every mutation goes through before
 * writing.
 */
export async function assertPermission(
  actor: Actor,
  projectId: string,
  permission: Permission,
): Promise<Membership> {
  const membership = await assertProjectAccess(actor, projectId);
  if (!roleCan(membership.role, permission)) {
    throw new ForbiddenError(
      `This action requires the ${PERMISSIONS[permission].join(" or ")} role.`,
    );
  }
  return membership;
}

/** Non-throwing read gate: is the actor an active member of the project? */
export async function canAccessProject(
  actor: Actor,
  projectId: string,
): Promise<boolean> {
  return (await getActiveMembership(actor, projectId)) !== null;
}

/**
 * Assert that `userId` is an **active** member of `projectId`. Used before
 * assignment/role mutations so changes only ever reference real active members
 * (PRD §7 "assignment must reference an active project member"). Assignment
 * never creates or implies membership.
 */
export async function assertActiveMember(
  projectId: string,
  userId: string,
): Promise<Membership> {
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

  if (!membership) {
    throw new ConflictError("That user is not an active member of this project.");
  }
  return membership;
}

/** True if the actor is an active member holding any of `roles`. */
export async function isMemberWithRole(
  actor: Actor,
  projectId: string,
  roles: readonly MembershipRole[],
): Promise<boolean> {
  const membership = await getActiveMembership(actor, projectId);
  return membership ? hasRole(membership, ...roles) : false;
}
