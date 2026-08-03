import { formatDistanceToNow } from "date-fns";
import { Mail, MailCheck, Clock } from "lucide-react";

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
 *
 * Styled to the Taskspace reference (`.impeccable/design.json`): display-face
 * heading, paper card with fine dividers, and a periwinkle role pill, with the
 * cobalt Accept + quiet Decline action pair.
 */

const ROLE_LABEL: Record<"editor" | "viewer", string> = {
  editor: "Editor",
  viewer: "Viewer",
};

const ROLE_PILL: Record<"editor" | "viewer", string> = {
  editor: "bg-[#eef0ff] text-[#5963ae]",
  viewer: "bg-[#f3f4fb] text-[#6e76a3]",
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
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <span className="text-[0.62rem] font-[760] uppercase tracking-[0.08em] text-[#6f7792]">
        Shared projects
      </span>
      <h1 className="font-heading mt-1 text-[1.9rem] leading-none font-[800] tracking-[-0.05em] text-[#202550]">
        Pending invitations
      </h1>
      <p className="mt-2 max-w-md text-[0.8rem] leading-[1.5] text-[#6f7792]">
        Projects where you&apos;ve been invited but haven&apos;t responded yet.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-[10px] border border-[#ff765d]/30 bg-[#fff0ed] p-4 text-sm text-[#8c2f22]"
        >
          {error}
        </p>
      ) : null}

      {!error && invitations.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-[14px] border border-dashed border-[#c3c7da] bg-[#fbfbff] p-12 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-[#eef0ff] text-[#5963ae]">
            <MailCheck className="size-5" />
          </span>
          <p className="mt-3 text-sm font-[700] text-[#202550]">You’re all caught up</p>
          <p className="mt-1 max-w-xs text-[0.78rem] leading-[1.5] text-[#6f7792]">
            New invitations will appear here.
          </p>
        </div>
      ) : null}

      {!error && invitations.length > 0 ? (
        <ul className="mt-8 divide-y divide-[#dfe2ef] overflow-hidden rounded-[14px] border border-[#dfe2ef] bg-[#fbfbff]">
          {invitations.map(({ invitation, projectName, invitedByName }) => (
            <li
              key={invitation.id}
              className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[9px] bg-[#3543d6] text-white">
                <Mail className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate text-[0.95rem] font-[720] text-[#202550]">
                    {projectName}
                  </span>
                  <span
                    className={`inline-flex h-[20px] items-center rounded-[5px] px-[6px] text-[0.59rem] font-[800] ${ROLE_PILL[invitation.role]}`}
                  >
                    {ROLE_LABEL[invitation.role]}
                  </span>
                </p>
                <p className="mt-1 truncate text-[0.8rem] text-[#6f7792]">
                  {invitedByName ?? "Someone"} invited you to join this project.
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-[#9299bb]">
                  <Clock className="size-3" />
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
