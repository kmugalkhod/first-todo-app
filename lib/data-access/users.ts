import { eq } from "drizzle-orm";

import { db, users } from "@/lib/db";

export type SyncUserInput = {
  authProviderId: string;
  email: string;
  displayName?: string | null;
};

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
