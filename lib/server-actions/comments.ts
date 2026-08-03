"use server";

import { addComment, deleteComment } from "@/lib/data-access";
import type { AddCommentInput, CommentDTO } from "@/lib/data-access";

import { requireActor, toActionResult } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Comment server actions (Task 0103).
 *
 * Adding a comment is editor/owner-gated; deleting follows the DAO rule that a
 * member may delete their own comment while owners can moderate any. The
 * comment's task and project are resolved from the DB, then the actor's
 * membership/role is re-checked server-side.
 */

/** Add a comment to a task. */
export async function addCommentAction(
  taskId: string,
  input: AddCommentInput,
): Promise<ActionResult<CommentDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    return addComment(actor, taskId, input);
  });
}

/** Soft-delete a comment (author, or owner as moderator). */
export async function deleteCommentAction(
  commentId: string,
): Promise<ActionResult<null>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    await deleteComment(actor, commentId);
    return null;
  });
}
