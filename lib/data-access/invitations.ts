import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, lte } from "drizzle-orm";

import {
  db,
  invitations,
  invitationRoleEnum,
  invitationStatusEnum,
  projectMemberships,
  projects,
  users,
} from "@/lib/db";
import { assertPermission } from "./access";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { recordActivityInTx } from "./activity";
import { transaction, type DbTransaction } from "./transaction";
import type { MemberDTO } from "./memberships";
import type { Actor } from "./types";

export type InvitationRole = (typeof invitationRoleEnum.enumValues)[number];
export type InvitationStatus = (typeof invitationStatusEnum.enumValues)[number];

export type InvitationDTO = {
  id: string;
  projectId: string;
  email: string;
  role: InvitationRole;
  status: InvitationStatus;
  expiresAt: Date;
  invitedBy: string;
  createdAt: Date;
};

export type CreateInvitationInput = {
  email: string;
  /** Editor or Viewer only — an invite can never grant Owner (PRD §7). */
  role: InvitationRole;
};

export type InvitationDecision = "accept" | "decline";

/** Invites expire after 7 days (PRD §10). */
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * One-way hash of a high-entropy invite token (PRD §10). The raw token is
 * generated elsewhere and kept **only** in the returned/emailed link — only
 * this hash is ever stored in the DB, so a database leak cannot be used to
 * forge an invite link.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function toInvitationDTO(row: typeof invitations.$inferSelect): InvitationDTO {
  return {
    id: row.id,
    projectId: row.projectId,
    email: row.email,
    role: row.role,
    status: row.status,
    expiresAt: row.expiresAt,
    invitedBy: row.invitedBy,
    createdAt: row.createdAt,
  };
}

/** Find a membership row inside an existing transaction (unique per pair). */
async function findMembershipInTx(
  tx: DbTransaction,
  projectId: string,
  userId: string,
) {
  const [row] = await tx
    .select()
    .from(projectMemberships)
    .where(
      and(
        eq(projectMemberships.projectId, projectId),
        eq(projectMemberships.userId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Create an invitation (owner only, `member:invite`). Generates a high-entropy
 * single-use token, stores only its SHA-256 hash, and returns the raw token
 * exactly once so the caller can build the emailed/returned link (Task 0203).
 *
 * If the invited email already belongs to an account, a `pending` membership is
 * created in the same transaction so pending/active/declined/removed states are
 * distinguishable (FR-2). One membership per project/user is preserved.
 */
export async function createInvitation(
  actor: Actor,
  projectId: string,
  input: CreateInvitationInput,
): Promise<{ invitation: InvitationDTO; token: string }> {
  await assertPermission(actor, projectId, "member:invite");

  const email = input.email?.trim().toLowerCase() ?? "";
  if (!email || !email.includes("@")) {
    throw new ValidationError("A valid email address is required.");
  }
  if (input.role !== "editor" && input.role !== "viewer") {
    throw new ValidationError("Invitations can only grant the Editor or Viewer role.");
  }

  // One pending invitation per project + email.
  const [existingInvite] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.projectId, projectId),
        eq(invitations.email, email),
        eq(invitations.status, "pending"),
      ),
    )
    .limit(1);
  if (existingInvite) {
    throw new ConflictError("An invitation to this email is already pending for this project.");
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
  const invitationId = crypto.randomUUID();

  // If the invitee already has an account we can link a pending membership now.
  const [invitee] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  await transaction(async (tx) => {
    await tx.insert(invitations).values({
      id: invitationId,
      projectId,
      email,
      role: input.role,
      tokenHash,
      status: "pending",
      expiresAt,
      invitedBy: actor.id,
    });

    if (invitee) {
      const existing = await findMembershipInTx(tx, projectId, invitee.id);
      if (existing) {
        if (existing.status === "active") {
          throw new ConflictError("That user is already a member of this project.");
        }
        // declined / removed / pending → re-open as pending (still one row).
        await tx
          .update(projectMemberships)
          .set({ status: "pending", role: input.role, invitedBy: actor.id, updatedAt: new Date() })
          .where(eq(projectMemberships.id, existing.id));
      } else {
        await tx.insert(projectMemberships).values({
          id: crypto.randomUUID(),
          projectId,
          userId: invitee.id,
          role: input.role,
          status: "pending",
          invitedBy: actor.id,
        });
      }
    }

    await recordActivityInTx(tx, {
      projectId,
      actorId: actor.id,
      action: "member_invited",
      metadata: { email, role: input.role },
    });
  });

  const [saved] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .limit(1);

  return { invitation: toInvitationDTO(saved), token: rawToken };
}

/**
 * Mark all pending invitations past their `expiresAt` as `expired` (PRD §10).
 * Returns the number of invitations expired. Called opportunistically when a
 * token is ingested so stale links can never be accepted after the fact.
 */
export async function markExpiredInvitations(): Promise<number> {
  const now = new Date();
  const res = await db
    .update(invitations)
    .set({ status: "expired", updatedAt: now })
    .where(and(eq(invitations.status, "pending"), lte(invitations.expiresAt, now)));
  return res.rowCount ?? 0;
}

/**
 * Look up an invitation by its stored token hash. Internal building block:
 * callers pass the raw token and let `findInvitationByToken` hash it.
 */
export async function findByTokenHash(tokenHash: string): Promise<InvitationDTO | null> {
  const [row] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.tokenHash, tokenHash))
    .limit(1);
  return row ? toInvitationDTO(row) : null;
}

/**
 * Resolve a raw token (from the emailed link) to its invitation, or `null`.
 * Status/expiry are intentionally NOT checked here so callers can distinguish
 * a genuinely missing invite from one that simply expired.
 */
export async function findInvitationByToken(token: string): Promise<InvitationDTO | null> {
  return findByTokenHash(hashToken(token));
}

/** Invitation joined with the human-readable project + inviter names. */
export type InvitationDetailDTO = {
  invitation: InvitationDTO;
  projectName: string;
  invitedByName: string | null;
  /** True when the invitation is past its `expiresAt` (computed server-side). */
  isExpired: boolean;
};

/**
 * Resolve a raw token (from the emailed link) to its invitation plus project
 * and inviter names for display. Never returns the raw token. Status/expiry are
 * intentionally NOT checked so callers can show the settled/expired state;
 * `isExpired` is computed here so UI components stay render-pure.
 */
export async function getInvitationDetailByToken(
  token: string,
): Promise<InvitationDetailDTO | null> {
  const [row] = await db
    .select({
      inv: invitations,
      projectName: projects.name,
      invitedByName: users.displayName,
    })
    .from(invitations)
    .innerJoin(projects, eq(projects.id, invitations.projectId))
    .leftJoin(users, eq(users.id, invitations.invitedBy))
    .where(eq(invitations.tokenHash, hashToken(token)))
    .limit(1);

  if (!row) return null;
  return {
    invitation: toInvitationDTO(row.inv),
    projectName: row.projectName,
    invitedByName: row.invitedByName,
    isExpired: row.inv.expiresAt.getTime() < Date.now(),
  };
}

/**
 * List the actor's pending invitations (invitee-facing surface, Task 0203).
 * Scoped to the actor's own email in the DB — no raw token is ever returned.
 * Stale pending invites are flipped to `expired` first (Task 0002 policy) so
 * they disappear from this active list.
 */
export async function listInvitationsForActor(
  actor: Actor,
): Promise<InvitationDetailDTO[]> {
  await markExpiredInvitations();

  const rows = await db
    .select({
      inv: invitations,
      projectName: projects.name,
      invitedByName: users.displayName,
    })
    .from(invitations)
    .innerJoin(projects, eq(projects.id, invitations.projectId))
    .leftJoin(users, eq(users.id, invitations.invitedBy))
    .where(
      and(eq(invitations.email, actor.email), eq(invitations.status, "pending")),
    )
    .orderBy(desc(invitations.createdAt));

  return rows.map((r) => ({
    invitation: toInvitationDTO(r.inv),
    projectName: r.projectName,
    invitedByName: r.invitedByName,
    isExpired: r.inv.expiresAt.getTime() < Date.now(),
  }));
}

/**
 * The invitee consumes a raw token from the emailed link.
 *  - `accept`  creates/activates an ACTIVE membership and marks the invite accepted.
 *  - `decline` marks the invite (and any pending membership) declined.
 *
 * Runs in a single transaction so `Invitation` and `ProjectMembership` always
 * agree (PRD §10). The signed-in actor must own the invited email. Returns the
 * final invitation plus (on accept) the resulting membership.
 */
export async function consumeInvitation(
  token: string,
  actor: Actor,
  decision: InvitationDecision,
): Promise<{ invitation: InvitationDTO; membership: MemberDTO | null }> {
  const tokenHash = hashToken(token);

  // Opportunistically expire stale invites before evaluation.
  await markExpiredInvitations();

  return transaction(async (tx) => {
    const [inv] = await tx
      .select()
      .from(invitations)
      .where(eq(invitations.tokenHash, tokenHash))
      .limit(1);
    if (!inv) {
      throw new NotFoundError("That invitation does not exist or the link is invalid.");
    }
    if (inv.status === "accepted") {
      throw new ConflictError("This invitation has already been accepted.");
    }
    if (inv.status === "revoked") {
      throw new ConflictError("This invitation has been revoked.");
    }
    if (inv.status === "declined") {
      throw new ConflictError("This invitation has already been declined.");
    }
    if (inv.status === "expired" || inv.expiresAt.getTime() < Date.now()) {
      throw new ConflictError("This invitation has expired.");
    }

    const [invitee] = await tx
      .select()
      .from(users)
      .where(eq(users.email, inv.email))
      .limit(1);
    if (!invitee) {
      throw new NotFoundError("No account matches this invitation yet. Sign up with the invited email first.");
    }
    if (invitee.id !== actor.id) {
      throw new ConflictError("This invitation was issued to a different account.");
    }

    return applyInvitationDecision(tx, inv, actor, decision, invitee);
  });
}

/**
 * Shared accept/decline core, reused by token consumption and the invitee's
 * pending-list response. Runs inside the caller's transaction so `Invitation`
 * and `ProjectMembership` always agree (PRD §10): accept creates/activates an
 * ACTIVE membership and marks the invite accepted; decline marks both the
 * pending membership (if any) and the invitation declined. Records the
 * corresponding activity event.
 */
async function applyInvitationDecision(
  tx: DbTransaction,
  inv: typeof invitations.$inferSelect,
  actor: Actor,
  decision: InvitationDecision,
  invitee: { id: string; email: string; displayName: string | null },
): Promise<{ invitation: InvitationDTO; membership: MemberDTO | null }> {
  let membership: MemberDTO | null = null;

  if (decision === "accept") {
    const existing = await findMembershipInTx(tx, inv.projectId, invitee.id);
    if (existing) {
      await tx
        .update(projectMemberships)
        .set({ status: "active", role: inv.role, updatedAt: new Date() })
        .where(eq(projectMemberships.id, existing.id));
    } else {
      await tx.insert(projectMemberships).values({
        id: crypto.randomUUID(),
        projectId: inv.projectId,
        userId: invitee.id,
        role: inv.role,
        status: "active",
        invitedBy: inv.invitedBy,
      });
    }
    await tx
      .update(invitations)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(invitations.id, inv.id));
    await recordActivityInTx(tx, {
      projectId: inv.projectId,
      actorId: actor.id,
      action: "member_accepted",
      metadata: { email: inv.email, role: inv.role },
    });
  } else {
    const existing = await findMembershipInTx(tx, inv.projectId, invitee.id);
    if (existing && existing.status === "pending") {
      await tx
        .update(projectMemberships)
        .set({ status: "declined", updatedAt: new Date() })
        .where(eq(projectMemberships.id, existing.id));
    }
    await tx
      .update(invitations)
      .set({ status: "declined", updatedAt: new Date() })
      .where(eq(invitations.id, inv.id));
    await recordActivityInTx(tx, {
      projectId: inv.projectId,
      actorId: actor.id,
      action: "member_declined",
      metadata: { email: inv.email },
    });
  }

  const [finalInv] = await tx
    .select()
    .from(invitations)
    .where(eq(invitations.id, inv.id))
    .limit(1);

  if (decision === "accept") {
    const memberRow = await findMembershipInTx(tx, inv.projectId, invitee.id);
    if (memberRow) {
      membership = {
        membershipId: memberRow.id,
        userId: memberRow.userId,
        name: invitee.displayName,
        email: invitee.email,
        role: memberRow.role,
        status: memberRow.status,
        joinedAt: memberRow.createdAt,
      };
    }
  }

  return { invitation: toInvitationDTO(finalInv), membership };
}

/**
 * The invitee responds to a pending invitation by **id** (from their pending
 * list, where no raw token is ever stored or exposed). Locates the invitation
 * by id **and** the invitee's own email so one invitee can never act on
 * another's row, then applies the same single-transaction accept/decline core.
 */
export async function respondToPendingInvitation(
  actor: Actor,
  invitationId: string,
  decision: InvitationDecision,
): Promise<{ invitation: InvitationDTO; membership: MemberDTO | null }> {
  // Opportunistically expire stale invites before evaluation (Task 0002 policy).
  await markExpiredInvitations();

  return transaction(async (tx) => {
    const [inv] = await tx
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, invitationId),
          eq(invitations.email, actor.email),
        ),
      )
      .limit(1);
    if (!inv) {
      throw new NotFoundError(
        "That invitation does not exist or was issued to a different account.",
      );
    }
    if (inv.status === "accepted") {
      throw new ConflictError("This invitation has already been accepted.");
    }
    if (inv.status === "revoked") {
      throw new ConflictError("This invitation has been revoked.");
    }
    if (inv.status === "declined") {
      throw new ConflictError("This invitation has already been declined.");
    }
    if (inv.status === "expired" || inv.expiresAt.getTime() < Date.now()) {
      throw new ConflictError("This invitation has expired.");
    }

    const [invitee] = await tx
      .select()
      .from(users)
      .where(eq(users.email, inv.email))
      .limit(1);
    if (!invitee) {
      throw new NotFoundError(
        "No account matches this invitation yet. Sign up with the invited email first.",
      );
    }
    if (invitee.id !== actor.id) {
      throw new ConflictError("This invitation was issued to a different account.");
    }

    return applyInvitationDecision(tx, inv, actor, decision, invitee);
  });
}
