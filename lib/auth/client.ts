"use client";

import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

/**
 * Browser-side auth client. Talks to the same-origin `/api/auth/*` handler
 * mounted from the server config in `lib/auth/config.ts`.
 */
export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
});
