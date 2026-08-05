import { formatDistanceToNow } from "date-fns";
import { Mail, MailCheck, Clock } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listInvitationsForActor } from "@/lib/data-access";
import { InvitationDecisionButtons } from "@/components/invitation-decision-buttons";
import {
  EmptyState,
  NoticeBanner,
  PageContainer,
  PageHeader,
  RolePill,
} from "@/components/ui/page-shell";

/**
 * Invitee-facing "pending invitations" surface (Task 0203 step 5).
 *
 * Lists the actor's open invitations (scoped to their own email server-side;
 * accepts/declines are keyed by invitation id — no raw token is involved).
 * Stale pending invites are flipped to `expired` before listing, per the
 * Task 0002 expiry policy.
 *
 * Layout and type come entirely from the shared page primitives
 * (`PageContainer` / `PageHeader` / `EmptyState` / `NoticeBanner` / `RolePill`)
 * and the `ts-*` type scale, so this page matches the rest of the app instead
 * of carrying its own hard-coded colours, sizes and radii.
 */

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
    <PageContainer>
      <PageHeader
        kicker="Shared projects"
        title="Pending invitations"
        description="Projects where you've been invited but haven't responded yet."
      />

      {error ? (
        <NoticeBanner className="mt-[var(--taskspace-space-section)]">
          {error}
        </NoticeBanner>
      ) : null}

      {!error && invitations.length === 0 ? (
        <EmptyState
          className="mt-[var(--taskspace-space-section)]"
          icon={<MailCheck className="size-5" />}
          title="You're all caught up"
          description="New invitations will appear here."
        />
      ) : null}

      {!error && invitations.length > 0 ? (
        <ul className="ts-panel mt-[var(--taskspace-space-section)] divide-y divide-border overflow-hidden">
          {invitations.map(({ invitation, projectName, invitedByName }) => (
            <li
              key={invitation.id}
              className="flex flex-col gap-[var(--taskspace-space-compact)] p-[var(--taskspace-space-section)] sm:flex-row sm:items-center"
            >
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-[var(--taskspace-radius-control)] bg-[var(--taskspace-periwinkle-pale)] text-[var(--taskspace-cobalt)]"
              >
                <Mail className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-[var(--taskspace-space-tight)] gap-y-[var(--taskspace-space-micro)]">
                  <span className="ts-section truncate">{projectName}</span>
                  <RolePill role={invitation.role} />
                </p>
                <p className="ts-body mt-[var(--taskspace-space-micro)]">
                  {invitedByName ?? "Someone"} invited you to join this project.
                </p>
                <p className="ts-meta mt-[var(--taskspace-space-tight)] flex items-center gap-1.5">
                  <Clock aria-hidden="true" className="size-3 shrink-0" />
                  Expires{" "}
                  {formatDistanceToNow(invitation.expiresAt, { addSuffix: true })}
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
    </PageContainer>
  );

}
