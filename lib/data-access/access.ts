import "server-only";

import { and, eq } from "drizzle-orm";

import {
  db,
  membershipRoleEnum,
  projectMemberships,
} from "@/lib/db";
import { ConflictError, ForbiddenError } from "./errors";
import type { Actor } from "./types";

export type MembershipRole = (typeof membershipRoleEnum.enumValues)[number];
export type Membership = typeof projectMemberships.$inferSelect;

/**
 * Explicit, testable role/permission matrix (PRD §7). This is the single
 * place role decision rules live — Task 0204 refines it, it is never scattered
 * as inline `if (role === ...)` checks through components or actions.
 *
 * Level ordering is used only for documentation/diagnostics; enforcement is by
 * membership in the allowed role set, not by numeric comparison.
 */
const ROLE_LEVEL: Record<MembershipRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export const PERMISSIONS = {
  /** View a project and its tasks, comments, members and activity (PRD §7). */
  "project:view": ["viewer", "editor", "owner"],
  /** Create, edit, complete and reopen tasks. */
  "task:write": ["editor", "owner"],
  /** Assign a task to an active project member. */
  "task:assign": ["editor", "owner"],
  /** Permanently delete a task. */
  "task:delete": ["editor", "owner"],
  /** Create/rename/reorder/remove sections. */
  "section:write": ["editor", "owner"],
  /** Create/rename/delete labels and apply them to tasks. */
  "label:write": ["editor", "owner"],
  /** Add comments. */
  "comment:add": ["editor", "owner"],
  /** Moderate (delete) any comment. */
  "comment:moderate": ["owner"],
  /** Invite members (Editor/Viewer) and change their roles. */
  "member:invite": ["owner"],
  "member:role": ["owner"],
  /** Remove members. */
  "member:remove": ["owner"],
  /** Transfer ownership, archive/restore the project. */
  "project:admin": ["owner"],
} as const satisfies Record<string, readonly MembershipRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export { ROLE_LEVEL };

/**
 * Return the actor's **active** membership in a project, or `null`. This is
 * the basis for every membership-scoped read — a non-member never sees even a
 * partial row (privacy NFR).
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
  if (!hasRole(membership, ...PERMISSIONS[permission])) {
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
 * (PRD §7 "assignment must reference an active project member").
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
