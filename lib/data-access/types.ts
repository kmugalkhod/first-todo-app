import type { users } from "@/lib/db";

/**
 * The authenticated actor passed as the **first argument** to every
 * data-access function. This is the internal Application user resolved by
 * `getCurrentUser()`. It is kept deliberately small — only the fields needed
 * for authorisation — so nothing sensitive can leak through it.
 */
export type Actor = {
  /** Internal Application user id (`users.id`). */
  id: string;
  /** Internal Application user email (`users.email`). */
  email: string;
};

export type UserRow = typeof users.$inferSelect;
