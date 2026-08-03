"use server";

import {
  changeMemberRole,
  removeMember,
} from "@/lib/data-access";
import type { MemberDTO } from "@/lib/data-access";

import { requireActor, toActionResult } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Membership server actions (Task 0103).
 *
 * Role changes and removals are owner-gated. The *acting* member is always
 * resolved from the session and re-checked inside the DAO; the `memberUserId`
 * supplied here is only the **target** of the operation and never grants the
 * actor any authority.
 */

/** Change a member's role to Editor or Viewer (owner only). */
export async function changeMemberRoleAction(
  projectId: string,
  memberUserId: string,
  newRole: "editor" | "viewer",
): Promise<ActionResult<MemberDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    return changeMemberRole(actor, projectId, memberUserId, newRole);
  });
}

/** Remove a member (owner only). The final owner may not be removed. */
export async function removeMemberAction(
  projectId: string,
  memberUserId: string,
): Promise<ActionResult<null>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    await removeMember(actor, projectId, memberUserId);
    return null;
  });
}
