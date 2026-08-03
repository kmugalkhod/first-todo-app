import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import { comments, db, tasks, users } from "@/lib/db";
import { assertPermission, assertProjectAccess, isMemberWithRole } from "./access";
import { ForbiddenError, NotFoundError, ValidationError } from "./errors";
import { recordActivity } from "./activity";
import type { Actor } from "./types";

export type CommentDTO = {
  id: string;
  taskId: string;
  author: { id: string; name: string | null } | null;
  body: string;
  createdAt: Date;
};

function toCommentDTO(
  row: Pick<
    typeof comments.$inferSelect,
    "id" | "taskId" | "authorId" | "body" | "createdAt" | "deletedAt"
  >,
  authorName: string | null,
): CommentDTO {
  return {
    id: row.id,
    taskId: row.taskId,
    author: row.authorId ? { id: row.authorId, name: authorName } : null,
    body: row.body,
    createdAt: row.createdAt,
  };
}

/** Load a task and assert the actor holds `permission` on its project. */
async function loadTaskWithPermission(
  actor: Actor,
  taskId: string,
  permission: Parameters<typeof assertPermission>[2],
) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) throw new NotFoundError("Task not found.");
  if (!task.projectId) throw new ForbiddenError("This inbox task is not project-scoped.");
  await assertPermission(actor, task.projectId, permission);
  const projectId = task.projectId;
  return { task, projectId };
}

export type AddCommentInput = {
  body: string;
};

/** Add a comment to a task (editor/owner). Plain text + links for the MVP. */
export async function addComment(
  actor: Actor,
  taskId: string,
  input: AddCommentInput,
): Promise<CommentDTO> {
  const { projectId } = await loadTaskWithPermission(actor, taskId, "comment:add");

  const body = input.body?.trim();
  if (!body) throw new ValidationError("Comment body is required.");

  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(comments).values({ id, taskId, authorId: actor.id, body, createdAt: now });

  await recordActivity({
    projectId,
    actorId: actor.id,
    action: "comment_added",
    taskId,
    metadata: { commentId: id },
  });

  const [row] = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
  return toCommentDTO(row, actor.email.split("@")[0] ?? actor.email);
}

/** List a task's live (non-deleted) comments, oldest first (project:view). */
export async function listCommentsForTask(
  actor: Actor,
  taskId: string,
): Promise<CommentDTO[]> {
  await loadTaskWithPermission(actor, taskId, "project:view");

  const rows = await db
    .select({ comments, authorName: users.displayName })
    .from(comments)
    .leftJoin(users, eq(users.id, comments.authorId))
    .where(
      and(eq(comments.taskId, taskId), isNull(comments.deletedAt)),
    )
    .orderBy(asc(comments.createdAt));

  return rows.map((r) => toCommentDTO(r.comments, r.authorName));
}

/** Resolve a comment's project + task for authorisation. */
async function loadCommentScope(commentId: string) {
  const [comment] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);
  if (!comment) throw new NotFoundError("Comment not found.");

  const [task] = await db
    .select({ projectId: tasks.projectId })
    .from(tasks)
    .where(eq(tasks.id, comment.taskId))
    .limit(1);
  if (!task?.projectId) throw new NotFoundError("Comment not found.");

  return { comment, projectId: task.projectId };
}

/**
 * Soft-delete a comment. Members delete their own; owners can moderate
 * (PRD FR-6 "Owners can moderate any comment"). Soft delete keeps history.
 */
export async function deleteComment(actor: Actor, commentId: string): Promise<void> {
  const { comment, projectId } = await loadCommentScope(commentId);
  await assertProjectAccess(actor, projectId);

  const isAuthor = comment.authorId === actor.id;
  const isOwner = await isMemberWithRole(actor, projectId, ["owner"]);
  if (!isAuthor && !isOwner) {
    throw new ForbiddenError("You can only delete your own comments.");
  }

  await db
    .update(comments)
    .set({ deletedAt: new Date() })
    .where(eq(comments.id, commentId));

  await recordActivity({
    projectId,
    actorId: actor.id,
    action: "comment_deleted",
    taskId: comment.taskId,
    metadata: { commentId },
  });
}
