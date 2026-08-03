import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth/config";
import { syncUser } from "@/lib/data-access/users";

/**
 * Resolve the current authenticated actor on the server.
 *
 * Returns `{ session, user }` where `user` is the internal Application user
 * (created/updated on this call), or `null` when there is no session.
 * Wrapped in React `cache()` so it is only resolved once per request graph.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  const user = await syncUser({
    authProviderId: session.user.id,
    email: session.user.email,
    displayName: session.user.name,
  });

  return { session, user };
});

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;
