import { formatDistanceToNow } from "date-fns";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listInvitationsForActor } from "@/lib/data-access";
import { InvitationDecisionButtons } from "@/components/invitation-decision-buttons";

/**
 * Invitee-facing "pending invitations" surface (Task 0203 step 5).
 *
 * Lists the actor's open invitations (scoped to their own email server-side;
 * accepts/declines are keyed by invitation id — no raw token is involved).
 * Stale pending invites are flipped to `expired` before listing, per the
 * Task 0002 expiry policy.
 */

const ROLE_LABEL: Record<"editor" | "viewer", string> = {
  editor: "Editor",
  viewer: "Viewer",
};

export default async function InvitationsPage() {
  const current = await getCurrentUser();

  // The `(app)` group's layout already redirects signed-out users; this is a
  // defensive guard so the page never renders without an actor.
  if (!current) return null;

  const actor = { id: current.user.id, email: current.user.email };

  let invitations: Awaited<ReturnType<typeof listInvitationsForActor>> = [];
  let error: string | null = null;
  try {
    invitations = await listInvitationsForActor(actor);
  } catch {
    error = "Couldn't load your invitations. Please try again.";
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">
        Pending invitations
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Projects where you&apos;ve been invited but haven&apos;t responded yet.
      </p>

      {error ? (
        <p className="mt-6 rounded-lg border border-border bg-card p-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!error && invitations.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            You&apos;re all caught up
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            New invitations will appear here.
          </p>
        </div>
      ) : null}

      {!error && invitations.length > 0 ? (
        <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">
          {invitations.map(({ invitation, projectName, invitedByName }) => (
            <li
              key={invitation.id}
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.95rem] font-semibold text-foreground">
                  {projectName}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {invitedByName ?? "Someone"} invited you as{" "}
                  <span className="font-medium text-foreground">
                    {ROLE_LABEL[invitation.role]}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Expires {formatDistanceToNow(invitation.expiresAt, { addSuffix: true })}
                </p>
              </div>
              <div className="w-full sm:w-auto sm:shrink-0">
                <InvitationDecisionButtons
                  invitationId={invitation.id}
                  projectId={invitation.projectId}
                  afterDecline="/invitations"
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
