"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  respondToPendingInvitationAction,
  respondToTokenAction,
} from "@/lib/server-actions/invitations";

/**
 * Accept / Decline buttons shared by the two invitee surfaces (Task 0203):
 *  - the emailed accept link (pass `token`), and
 *  - the persistent pending-invitations list (pass `invitationId`).
 *
 * Both call the same single-use, expiry-guarded server action family. Exactly
 * one of `token` / `invitationId` must be provided.
 *
 * Styled to Taskspace's Primary Action spec (`.impeccable/design.json`):
 * Accept is the cobalt advancement control; Decline is the quiet outline
 * counterpart. The pair stays compact beside the invite row and stacks on
 * small screens.
 */
export function InvitationDecisionButtons({
  token,
  invitationId,
  projectId,
  afterDecline = "/",
}: {
  token?: string;
  invitationId?: string;
  projectId: string;
  afterDecline?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<"accept" | "decline" | null>(null);

  async function decide(decision: "accept" | "decline") {
    setBusy(decision);
    const result = token
      ? await respondToTokenAction(token, decision)
      : await respondToPendingInvitationAction(invitationId!, decision);
    setBusy(null);

    if (!result.ok) {
      toast.error(result.error.message ?? "Something went wrong.");
      router.refresh();
      return;
    }

    if (decision === "accept") {
      toast.success("You're in! Welcome to the project.");
      router.replace(`/?project=${projectId}`);
    } else {
      toast.success("Invitation declined.");
      router.replace(afterDecline);
    }
    router.refresh();
  }

  return (
    <div className="inline-flex shrink-0 flex-col gap-2 sm:flex-row">
      <Button
        type="button"
        disabled={busy !== null}
        onClick={() => decide("accept")}
        className="h-10 rounded-[var(--taskspace-radius-control)] bg-[var(--taskspace-cobalt)] px-3.5 text-[length:var(--taskspace-font-size-body)] font-[var(--taskspace-weight-label)] text-white transition-colors hover:bg-[var(--taskspace-cobalt-deep)] sm:h-[35px]"
      >
        <Check className="size-3.5" />
        {busy === "accept" ? "Joining…" : "Accept invitation"}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={busy !== null}
        onClick={() => decide("decline")}
        className="h-10 rounded-[var(--taskspace-radius-control)] border border-[var(--taskspace-line)] bg-white px-3.5 text-[length:var(--taskspace-font-size-body)] font-[var(--taskspace-weight-label)] text-[var(--taskspace-muted)] transition-colors hover:bg-[var(--taskspace-selected-surface)] sm:h-[35px]"
      >
        <X className="size-3.5" />
        {busy === "decline" ? "Declining…" : "Decline"}
      </Button>
    </div>
  );
}
