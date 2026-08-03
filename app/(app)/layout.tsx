import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";

/**
 * Protected shell. Every route inside the `(app)` group requires an
 * authenticated session; unauthenticated visitors are redirected to sign-in
 * and no protected data is rendered into the response / client bundle.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/sign-in");
  }

  return <>{children}</>;
}
