"use server";

import {
  consumeInvitation,
  respondToPendingInvitation,
} from "@/lib/data-access";
import type { InvitationDecision, InvitationDTO, MemberDTO } from "@/lib/data-access";

import { requireActor, toActionResult } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Invitation response server actions (Task 0203).
 *
 * The actor is always resolved from the session and re-checked inside the DAO
 * (the invitee must own the invited email; accept/decline is single-use and
 * expiry-guarded). Two entry points cover the two invitee surfaces:
 *  - the emailed accept link (`respondToTokenAction`, keyed by raw token), and
 *  - the persistent pending-invitations list (`respondToPendingInvitationAction`,
 *    keyed by invitation id — node raw token is ever persisted or returned).
 */

export type InvitationResponse = {
  invitation: InvitationDTO;
  membership: MemberDTO | null;
};

/** Respond to the emailed accept-link token: accept or decline. */
export async function respondToTokenAction(
  token: string,
  decision: InvitationDecision,
): Promise<ActionResult<InvitationResponse>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    return consumeInvitation(token, actor, decision);
  });
}

/** Respond (accept/decline) to a pending invitation from the invitee's list. */
export async function respondToPendingInvitationAction(
  invitationId: string,
  decision: InvitationDecision,
): Promise<ActionResult<InvitationResponse>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    return respondToPendingInvitation(actor, invitationId, decision);
  });
}
