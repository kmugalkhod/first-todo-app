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
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        type="button"
        disabled={busy !== null}
        onClick={() => decide("accept")}
        className="h-11 flex-1 rounded-xl"
      >
        <Check className="size-4" />
        {busy === "accept" ? "Joining…" : "Accept invitation"}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={busy !== null}
        onClick={() => decide("decline")}
        className="h-11 flex-1 rounded-xl"
      >
        <X className="size-4" />
        {busy === "decline" ? "Declining…" : "Decline"}
      </Button>
    </div>
  );
}
