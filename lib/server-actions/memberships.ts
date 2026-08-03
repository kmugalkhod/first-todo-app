"use server";

import {
  changeMemberRole,
  createInvitation,
  getProject,
  removeMember,
} from "@/lib/data-access";
import type { InvitationDTO, MemberDTO } from "@/lib/data-access";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { sendInvitationEmail } from "@/lib/email/invitation";

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
 * Owner creates an invitation (Task 0202 + 0203) and sends the invitation
 * email. Returns the raw single-use token so callers can also surface a
 * fallback accept link — the token is never stored (only its hash is). The
 * emailed accept link carries the raw token exactly once; the DB is the
 * authoritative state, so a delivery failure logs a warning but never strands
 * a valid invitation.
 */
export async function inviteMemberAction(
  projectId: string,
  input: { email: string; role: "editor" | "viewer" },
): Promise<ActionResult<{ invitation: InvitationDTO; token: string }>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    const result = await createInvitation(actor, projectId, input);

    try {
      const [project, current] = await Promise.all([
        getProject(actor, projectId),
        getCurrentUser(),
      ]);
      await sendInvitationEmail({
        to: input.email,
        url: `/invite/${result.token}`,
        projectName: project?.name ?? "a project",
        inviterName: current?.user.displayName || actor.email,
        role: input.role,
      });
    } catch (err) {
      // Delivery is best-effort; the invitation row + token are already valid.
      console.error("[invite] Failed to send invitation email", err);
    }

    return result;
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
