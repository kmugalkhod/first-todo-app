"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Settings2, Users } from "lucide-react";
import { toast } from "sonner";

import type { MemberDTO } from "@/lib/data-access";
import { listMembersAction } from "@/lib/server-actions/memberships";
import { MembersDialog } from "./members-dialog";
import { PeopleStack } from "./people-stack";

/**
 * Project-aware "People" surface for the sidebar footer (Task 0205).
 *
 * Tracks the currently selected project via `?project=` and shows its active
 * member avatar stack (citron for the Owner) plus a Manage button that opens
 * the full Member Management dialog. Server is the source of truth; the stack
 * is re-fetched whenever the selected project changes or the dialog reports a
 * mutation. With no project selected we keep a quiet placeholder.
 */
export function MembersSection({ meUserId }: { meUserId: string }) {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const [members, setMembers] = React.useState<MemberDTO[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Re-fetch whenever the selected project changes or after a reported mutation.
  React.useEffect(() => {
    if (!projectId) return;
    let active = true;
    listMembersAction(projectId).then((res) => {
      if (active && res.ok) {
        setMembers(res.data.filter((m) => m.status === "active"));
      }
    });
    return () => {
      active = false;
    };
  }, [projectId, reloadKey]);

  // Only surface the roster for a *selected* project; switching projects clears
  // the shown stack (server state is re-fetched above).
  const shownMembers = projectId ? members : [];
  const activeCount = shownMembers.length;
  const isOwner = shownMembers.some(
    (m) => m.role === "owner" && m.userId === meUserId,
  );

  // Opening always reacts so the control never feels dead: without a selected
  // project we explain why instead of silently no-opping (previously the button
  // was disabled, which read as "not working").
  function openDialog() {
    if (!projectId) {
      toast("Select a project first to manage its members.");
      return;
    }
    setDialogOpen(true);
  }

  return (
    <div className="px-2 pb-3">
      <div className="flex items-center justify-between gap-2 px-2">
        <p className="flex items-center gap-1.5 text-[0.62rem] font-[750] uppercase tracking-[0.08em] text-[#c9cdfd]">
          <Users className="size-3.5" />
          People
        </p>
        <button
          type="button"
          onClick={openDialog}
          aria-label="Manage members"
          title={projectId ? "Manage members" : "Select a project to manage members"}
          className="flex items-center gap-1 rounded-md p-1 text-[0.62rem] font-[700] text-[#c9cdfd] transition-colors hover:bg-white/10 hover:text-white"
        >
          <Settings2 className="size-3.5" />
          Manage
        </button>
      </div>

      {projectId ? (
        <div className="pl-3.5 pt-2">
          {members.length === 0 ? (
            <p className="text-xs leading-5 text-[#c9cdfd]/75">
              Loading members…
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="flex w-full items-center gap-2 rounded-lg p-1 text-left transition-colors hover:bg-white/10"
            >
              <PeopleStack
                members={shownMembers}
                max={4}
                ringClassName="ring-[#3543d6]"
              />
              <span className="min-w-0 flex-1 truncate text-xs text-[#c9cdfd]">
                {activeCount} {activeCount === 1 ? "member" : "members"}
                {isOwner ? " · you’re the owner" : ""}
              </span>
            </button>
          )}
        </div>
      ) : (
        <p className="pl-3.5 pt-1 text-xs leading-5 text-[#c9cdfd]/75">
          No project selected.
        </p>
      )}

      <MembersDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId ?? ""}
        meUserId={meUserId}
        onChanged={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
