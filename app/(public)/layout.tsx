import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";

/**
 * Public route group. Every route here (e.g. `/sign-in`) is reachable
 * without a session, but a signed-in user has no business on them — they are
 * bounced straight into the protected application shell at `/`.
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/");
  }

  return <>{children}</>;
}
