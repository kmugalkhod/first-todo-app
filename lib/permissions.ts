/**
 * Role/permission matrix (PRD §7, Task 0204)
 *
 * This module is intentionally **pure**: it has no imports from `server-only`
 * or the database, so it can be unit-tested in a plain Node runner and reused
 * by both the server-side guard (`lib/data-access/access.ts`) and, if desired,
 * by client code to derive UI affordances from the same map (defence in depth —
 * the server still enforces everything regardless of what the UI shows).
 *
 * Roles: `owner`, `editor`, `viewer`. Level ordering is used only for
 * documentation/diagnostics; enforcement is by membership in the allowed role
 * set, never by numeric comparison.
 */
export const ROLES = ["owner", "editor", "viewer"] as const;
export type MembershipRole = (typeof ROLES)[number];

export const ROLE_LEVEL: Record<MembershipRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

/**
 * The single source of truth for what each role may do. One entry per action;
 * each maps to the set of roles allowed to perform it (empty = nobody).
 */
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
  /** Transfer ownership, archive/restore/delete the project. */
  "project:admin": ["owner"],
} as const satisfies Record<string, readonly MembershipRole[]>;

export type Permission = keyof typeof PERMISSIONS;

/** Matrix widened to a uniform shape so membership checks type-check cleanly. */
const ALLOWED: Readonly<Record<Permission, readonly MembershipRole[]>> =
  PERMISSIONS;

/** Does `role` hold `permission`? Pure, synchronous, unit-testable. */
export function roleCan(role: MembershipRole, permission: Permission): boolean {
  return ALLOWED[permission].includes(role);
}

/** Every permission `role` is allowed to perform (used to derive UI affordances). */
export function permissionsForRole(role: MembershipRole): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((permission) =>
    roleCan(role, permission),
  );
}
