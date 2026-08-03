import "server-only";

import { eq } from "drizzle-orm";

import { db, users } from "@/lib/db";
import { NotFoundError } from "./errors";
import type { Actor } from "./types";

export type SyncUserInput = {
  authProviderId: string;
  email: string;
  displayName?: string | null;
};

/**
 * A user as exposed to screens. Deliberately strips the internal
 * `authProviderId` (and anything else a screen does not need) at the layer
 * boundary — minimum disclosure (privacy NFR).
 */
export type UserDTO = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export function toUserDTO(
  row: typeof users.$inferSelect,
): UserDTO {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName ?? null,
    avatarUrl: row.avatarUrl ?? null,
  };
}

/**
 * Find-or-create the internal Application `User` (PRD FR-1).
 *
 * Keyed on the stable BetterAuth user id (`auth_provider_id`, which is unique),
 * using a single atomic `INSERT ... ON CONFLICT DO UPDATE` so concurrent first
 * sign-ins cannot race. Emails and display name are refreshed from the provider
 * on every authenticated entry.
 */
export async function syncUser(input: SyncUserInput) {
  const now = new Date();
  const displayName = input.displayName ?? null;

  await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      authProviderId: input.authProviderId,
      email: input.email,
      displayName,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.authProviderId,
      set: { email: input.email, displayName, updatedAt: now },
    });

  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.authProviderId, input.authProviderId))
    .limit(1);

  return row;
}

/**
 * Fetch a user's safe profile by internal id, or `null`. Only DTO fields are
 * returned — the sensitive `authProviderId` never leaves the layer.
 */
export async function getUserById(
  _actor: Actor,
  userId: string,
): Promise<UserDTO | null> {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return row ? toUserDTO(row) : null;
}

/** Throwing variant of `getUserById`. */
export async function requireUserById(actor: Actor, userId: string): Promise<UserDTO> {
  const user = await getUserById(actor, userId);
  if (!user) throw new NotFoundError("User not found.");
  return user;
}
