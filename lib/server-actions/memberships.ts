"use server";

import {
  changeMemberRole,
  createInvitation,
  removeMember,
} from "@/lib/data-access";
import type { InvitationDTO, MemberDTO } from "@/lib/data-access";

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

/**
 * Owner creates an invitation (Task 0202). Returns the raw single-use token so
 * Task 0203 can build the emailed/returned link — the token is never stored.
 */
export async function inviteMemberAction(
  projectId: string,
  input: { email: string; role: "editor" | "viewer" },
): Promise<ActionResult<{ invitation: InvitationDTO; token: string }>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    return createInvitation(actor, projectId, input);
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
