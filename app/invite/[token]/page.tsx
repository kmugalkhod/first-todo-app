import Link from "next/link";
import { cn } from "@/lib/utils";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getInvitationDetailByToken } from "@/lib/data-access";
import { buttonVariants } from "@/components/ui/button";
import { InvitationDecisionButtons } from "@/components/invitation-decision-buttons";

const LINK_SM = { size: "lg" } as const;

/**
 * Accept/decline page for the emailed invitation link (Task 0203).
 *
 * The raw single-use token arrives in the URL, is hashed and looked up on the
 * server (never persisted in plaintext), and every mutation is re-guarded
 * server-side (expiry + reuse + email match). This route lives outside the
 * `(public)` group — which redirects signed-in users away — so both signed-out
 * and signed-in invitees can reach it.
 */

const ROLE_LABEL: Record<"editor" | "viewer", string> = {
  editor: "Editor",
  viewer: "Viewer",
};

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-primary">Taskspace</p>
        {children}
      </div>
    </main>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const detail = await getInvitationDetailByToken(token);

  if (!detail) {
    return (
      <InviteShell>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-foreground">
          Invitation not found
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This link is not valid — it may have been mistyped, or the invitation
          no longer exists.
        </p>
      </InviteShell>
    );
  }

  const { invitation, projectName, invitedByName, isExpired } = detail;
  const settled = invitation.status !== "pending" || isExpired;

  const currentUser = await getCurrentUser();
  const currentEmail = currentUser?.user.email ?? null;

  let statusHeading: string | null = null;
  let statusBody: string | null = null;
  if (isExpired) {
    statusHeading = "Invitation expired";
    statusBody =
      "This invitation has expired. Ask the project owner to send you a new one.";
  } else if (invitation.status === "accepted") {
    statusHeading = "Already accepted";
    statusBody = "This invitation has already been accepted.";
  } else if (invitation.status === "declined") {
    statusHeading = "Already declined";
    statusBody = "This invitation was already declined.";
  } else if (invitation.status === "revoked") {
    statusHeading = "Invitation revoked";
    statusBody = "The project owner revoked this invitation.";
  }

  return (
    <InviteShell>
      <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-foreground">
        {settled ? statusHeading : `You're invited to “${projectName}”`}
      </h1>

      {!settled ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {invitedByName ?? "Someone"} invited you to join as{" "}
          <span className="font-semibold text-foreground">
            {ROLE_LABEL[invitation.role]}
          </span>
          .
        </p>
      ) : (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{statusBody}</p>
      )}

      {!settled && !currentUser ? (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-sm leading-6 text-muted-foreground">
            To respond, sign in or create an account with{" "}
            <span className="font-medium text-foreground">{invitation.email}</span>{" "}
            — the invitation is tied to that address.
          </p>
          <Link
            href={`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`}
            className={cn(buttonVariants(LINK_SM), "h-11 w-full rounded-xl")}
          >
            Sign in / create account
          </Link>
        </div>
      ) : null}

      {!settled &&
      currentUser &&
      currentEmail?.toLowerCase() !== invitation.email.toLowerCase() ? (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-sm leading-6 text-muted-foreground">
            This invitation is for{" "}
            <span className="font-medium text-foreground">{invitation.email}</span>,
            but you&apos;re signed in as{" "}
            <span className="font-medium text-foreground">{currentEmail}</span>.
            Please sign in with the invited account.
          </p>
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ ...LINK_SM, variant: "outline" }),
              "h-11 w-full rounded-xl",
            )}
          >
            Switch account
          </Link>
        </div>
      ) : null}

      {!settled && currentUser && currentEmail?.toLowerCase() === invitation.email.toLowerCase() ? (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-xs leading-5 text-muted-foreground">
            Signed in as {currentEmail}.
          </p>
          <InvitationDecisionButtons
            token={token}
            projectId={invitation.projectId}
            afterDecline="/invitations"
          />
        </div>
      ) : null}

      {settled ? (
        <div className="mt-6">
          <Link
            href="/"
            className={cn(
              buttonVariants({ ...LINK_SM, variant: "outline" }),
              "h-11 w-full rounded-xl",
            )}
          >
            Go to Taskspace
          </Link>
        </div>
      ) : null}
    </InviteShell>
  );
}
