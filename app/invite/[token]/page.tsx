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

/**
 * The invite card sits on the cool outer canvas as a genuinely floating
 * surface, so it is one of the few places DESIGN.md allows elevation
 * (Flat-Until-Floating). Brand mark + dialog radius match the sign-in shell so
 * the two signed-out surfaces read as one product.
 */
function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--taskspace-canvas)] p-[var(--taskspace-space-compact)] sm:p-[var(--taskspace-space-content)]">
      <div className="w-full max-w-md rounded-[var(--taskspace-radius-dialog)] border border-border bg-[var(--taskspace-paper)] p-[var(--taskspace-space-section)] shadow-[var(--taskspace-shell-shadow)] sm:p-[var(--taskspace-space-content)]">
        <div className="flex items-center gap-[var(--taskspace-space-control)]">
          <span
            aria-hidden="true"
            className="relative size-[15px] shrink-0 rotate-45 rounded-[var(--taskspace-radius-chip)] bg-[var(--taskspace-cobalt)] shadow-[6px_6px_0_-3px_var(--taskspace-citron)]"
          />
          <p className="ts-label text-[var(--taskspace-cobalt)]">Taskspace</p>
        </div>
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
        <h1 className="ts-display-sm mt-[var(--taskspace-space-compact)]">
          Invitation not found
        </h1>
        <p className="ts-body mt-[var(--taskspace-space-control)]">
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
      <h1 className="ts-display-sm mt-[var(--taskspace-space-compact)]">
        {settled ? statusHeading : `You're invited to “${projectName}”`}
      </h1>

      {!settled ? (
        <p className="ts-body mt-[var(--taskspace-space-control)]">
          {invitedByName ?? "Someone"} invited you to join as{" "}
          <span className="font-semibold text-[var(--taskspace-ink)]">
            {ROLE_LABEL[invitation.role]}
          </span>
          .
        </p>
      ) : (
        <p className="ts-body mt-[var(--taskspace-space-control)]">{statusBody}</p>
      )}

      {!settled && !currentUser ? (
        <div className="mt-[var(--taskspace-space-section)] flex flex-col gap-[var(--taskspace-space-compact)]">
          <p className="ts-body">
            To respond, sign in or create an account with{" "}
            <span className="font-medium text-[var(--taskspace-ink)]">{invitation.email}</span>{" "}
            — the invitation is tied to that address.
          </p>
          <Link
            href={`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`}
            className={cn(buttonVariants(LINK_SM), "h-11 w-full rounded-[var(--taskspace-radius-control)]")}
          >
            Sign in / create account
          </Link>
        </div>
      ) : null}

      {!settled &&
      currentUser &&
      currentEmail?.toLowerCase() !== invitation.email.toLowerCase() ? (
        <div className="mt-[var(--taskspace-space-section)] flex flex-col gap-[var(--taskspace-space-compact)]">
          <p className="ts-body">
            This invitation is for{" "}
            <span className="font-medium text-[var(--taskspace-ink)]">{invitation.email}</span>,
            but you&apos;re signed in as{" "}
            <span className="font-medium text-[var(--taskspace-ink)]">{currentEmail}</span>.
            Please sign in with the invited account.
          </p>
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ ...LINK_SM, variant: "outline" }),
              "h-11 w-full rounded-[var(--taskspace-radius-control)]",
            )}
          >
            Switch account
          </Link>
        </div>
      ) : null}

      {!settled && currentUser && currentEmail?.toLowerCase() === invitation.email.toLowerCase() ? (
        <div className="mt-[var(--taskspace-space-section)] flex flex-col gap-[var(--taskspace-space-compact)]">
          <p className="ts-meta">
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
        <div className="mt-[var(--taskspace-space-section)]">
          <Link
            href="/"
            className={cn(
              buttonVariants({ ...LINK_SM, variant: "outline" }),
              "h-11 w-full rounded-[var(--taskspace-radius-control)]",
            )}
          >
            Go to Taskspace
          </Link>
        </div>
      ) : null}
    </InviteShell>
  );
}
