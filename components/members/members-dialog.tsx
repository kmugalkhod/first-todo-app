"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  Crown,
  Mail,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import type { InvitationDTO, MemberDTO } from "@/lib/data-access";
import {
  changeMemberRoleAction,
  inviteMemberAction,
  listMembersAction,
  listProjectInvitationsAction,
  removeMemberAction,
} from "@/lib/server-actions/memberships";
import { getProjectAction, transferOwnershipAction } from "@/lib/server-actions/projects";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { MemberAvatar } from "./member-avatar";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending",
};

type ConfirmState =
  | { kind: "remove"; member: MemberDTO }
  | { kind: "transfer"; member: MemberDTO }
  | null;

/**
 * Owner-facing Member Management surface (Task 0205).
 *
 * - Lists active members + pending invitations (pending vs active are kept
 *   distinguishable, FR-2).
 * - Invite (email + Editor/Viewer role) → `inviteMemberAction`.
 * - Change role (Editor/Viewer) and remove members, each owner-gated server-side
 *   with the final-owner guard.
 * - Transfer ownership → `transferOwnershipAction` (promotes a member to Owner
 *   and demotes the current Owner to Viewer).
 *
 * The server is always the source of truth: every mutation returns a fresh
 * snapshot from the DAO, and we call `router.refresh()` + `load()` so all open
 * clients converge on the new state. We never trust optimistic UI state alone.
 */
export function MembersDialog({
  open,
  onOpenChange,
  projectId,
  meUserId,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  meUserId: string;
  /** Called after any successful mutation so parent surfaces can re-sync too. */
  onChanged?: () => void;
}) {
  const router = useRouter();

  const [members, setMembers] = React.useState<MemberDTO[]>([]);
  const [invitations, setInvitations] = React.useState<InvitationDTO[]>([]);
  const [projectName, setProjectName] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Invite form state.
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<"editor" | "viewer">("editor");
  const [inviting, setInviting] = React.useState(false);

  // Per-member mutation id, e.g. "role-<userId>" so we can disable one row at a time.
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<ConfirmState>(null);

  // Loading starts true (first open); it flips to false in the async
  // continuation so no state is set synchronously within the effect below.
  const load = React.useCallback(async () => {
    if (!projectId) return;
    const [mRes, iRes] = await Promise.all([
      listMembersAction(projectId),
      listProjectInvitationsAction(projectId),
    ]);
    if (mRes.ok) setMembers(mRes.data);
    if (iRes.ok) setInvitations(iRes.data);
    setLoadError(
      !mRes.ok && !iRes.ok
        ? mRes.error.message ?? "Couldn't load members."
        : null,
    );
    setLoading(false);
  }, [projectId]);

  // Reload whenever the dialog opens (or the project changes) so the surface is
  // always freshly derived from the server, never stale client state. State is
  // only updated in the async continuation, never synchronously in the effect.
  React.useEffect(() => {
    if (!open || !projectId) return;
    Promise.all([
      listMembersAction(projectId),
      listProjectInvitationsAction(projectId),
      getProjectAction(projectId),
    ]).then(([mRes, iRes, pRes]) => {
      if (mRes.ok) setMembers(mRes.data);
      if (iRes.ok) setInvitations(iRes.data);
      if (pRes.ok) setProjectName(pRes.data.name);
      setLoadError(
        !mRes.ok && !iRes.ok
          ? mRes.error.message ?? "Couldn't load members."
          : null,
      );
      setLoading(false);
    });
  }, [open, projectId]);

  const activeMembers = members.filter((m) => m.status === "active");
  const owners = activeMembers.filter((m) => m.role === "owner");
  const me = activeMembers.find((m) => m.userId === meUserId);
  const canManage = me?.role === "owner";

  // The final Owner may never be removed (PRD §7); a role can never be changed
  // away from Owner via role-change (ownership moves only via transfer).
  const isSoleOwner = (m: MemberDTO) =>
    m.role === "owner" && owners.length <= 1;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const res = await inviteMemberAction(projectId, {
      email: inviteEmail.trim(),
      role: inviteRole,
    });
    setInviting(false);
    if (!res.ok) {
      toast.error(res.error.message ?? "Couldn't send the invitation.");
      return;
    }
    toast.success(`Invited ${res.data.invitation.email} as ${ROLE_LABEL[res.data.invitation.role]}.`);
    setInviteEmail("");
    router.refresh();
    void load();
    onChanged?.();
  }

  async function changeRole(member: MemberDTO, role: "editor" | "viewer") {
    const key = `role-${member.userId}`;
    setBusy(key);
    const res = await changeMemberRoleAction(projectId, member.userId, role);
    setBusy(null);
    if (!res.ok) {
      toast.error(res.error.message ?? "Couldn't change role.");
      return;
    }
    toast.success(`${member.name || member.email} is now ${ROLE_LABEL[role]}.`);
    router.refresh();
    void load();
    onChanged?.();
  }

  async function confirmRemove() {
    if (!confirm || confirm.kind !== "remove") return;
    const member = confirm.member;
    const key = `remove-${member.userId}`;
    setBusy(key);
    const res = await removeMemberAction(projectId, member.userId);
    setBusy(null);
    setConfirm(null);
    if (!res.ok) {
      toast.error(res.error.message ?? "Couldn't remove member.");
      return;
    }
    toast.success(`Removed ${member.name || member.email} from the project.`);
    router.refresh();
    void load();
    onChanged?.();
  }

  async function confirmTransfer() {
    if (!confirm || confirm.kind !== "transfer") return;
    const member = confirm.member;
    const key = `transfer-${member.userId}`;
    setBusy(key);
    const res = await transferOwnershipAction(projectId, member.userId);
    setBusy(null);
    setConfirm(null);
    if (!res.ok) {
      toast.error(res.error.message ?? "Couldn't transfer ownership.");
      return;
    }
    toast.success(`Ownership transferred to ${member.name || member.email}.`);
    // The current owner is now a Viewer, so this dialog is no longer manageable;
    // close it and converge every client on the fresh state.
    onOpenChange(false);
    router.refresh();
    void load();
    onChanged?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(85vh,720px)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-4" />
            <span>
              Members{projectName ? ` · ${projectName}` : ""}
            </span>
          </DialogTitle>
          <DialogDescription>
            Managing access to{" "}
            <span className="font-medium text-foreground">
              {projectName || "this project"}
            </span>
            . Pending invitations are shown until they&apos;re accepted.
          </DialogDescription>
        </DialogHeader>

        {loadError ? (
          <p className="rounded-lg border border-border bg-card p-3 text-sm text-destructive">
            {loadError}
          </p>
        ) : null}

        {canManage ? (
          <form onSubmit={handleInvite} className="space-y-2.5">
            <p className="flex items-center gap-1.5 text-[0.62rem] font-[750] uppercase tracking-[0.08em] text-muted-foreground">
              <UserPlus className="size-3.5" />
              Invite a collaborator
            </p>
            <label className="block text-[0.66rem] font-[750] text-[#56607e]">
              Email address
              <Input
                id="member-email"
                type="email"
                required
                placeholder="name@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-[5px] h-[38px] w-full rounded-[7px] border border-[#d8ddec] bg-white px-[9px] text-[0.75rem] text-[#202550] outline-none placeholder:text-[#a1a7c4] focus-visible:border-[#a2aaef] focus-visible:ring-3 focus-visible:ring-[#ff765d]/35"
              />
            </label>
            <label className="block text-[0.66rem] font-[750] text-[#56607e]">
              Role
              <select
                id="member-role"
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as "editor" | "viewer")
                }
                className="mt-[5px] h-[38px] w-full cursor-pointer rounded-[7px] border border-[#d8ddec] bg-white px-[9px] text-[0.75rem] text-[#202550] outline-none focus-visible:border-[#a2aaef] focus-visible:ring-3 focus-visible:ring-[#ff765d]/35"
              >
                <option value="editor">Editor — can edit tasks and sections</option>
                <option value="viewer">Viewer — can view and comment</option>
              </select>
            </label>
            <Button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="h-[35px] w-full rounded-[7px] bg-[#3543d6] px-3 text-[0.72rem] font-[760] text-white transition-colors hover:bg-[#252d95] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserPlus className="size-3.5" />
              {inviting ? "Sending…" : "Send invitation"}
            </Button>
          </form>
        ) : null}

        <div className="space-y-4">
          <section>
            <p className="mb-1.5 flex items-center justify-between text-[0.62rem] font-[750] uppercase tracking-[0.08em] text-muted-foreground">
              <span>Members ({activeMembers.length})</span>
              <MemberAvatar
                name={me?.name ?? me?.email}
                email={me?.email}
                isOwner={me?.role === "owner"}
                className="size-5"
              />
            </p>
            {loading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Loading members…</p>
            ) : activeMembers.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                No members yet — invite someone to join.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {activeMembers.map((member) => {
                  const key = `${member.userId}-${member.role}-${member.status}`;
                  const rowBusy = busy === `role-${member.userId}` || busy === `remove-${member.userId}` || busy === `transfer-${member.userId}`;
                  const isMe = member.userId === meUserId;
                  return (
                    <li
                      key={key}
                      className="flex items-center gap-3 px-3 py-2.5"
                    >
                      <MemberAvatar
                        name={member.name}
                        email={member.email}
                        isOwner={member.role === "owner"}
                        className="size-8"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                          {member.name || member.email}
                          {isMe ? (
                            <span className="text-xs font-normal text-muted-foreground">(you)</span>
                          ) : null}
                          {member.role === "owner" ? (
                            <Crown className="size-3 shrink-0 text-[#edff81]" />
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {ROLE_LABEL[member.role]}
                          {member.email !== member.name ? ` · ${member.email}` : ""}
                        </p>
                      </div>
                      {canManage && !isSoleOwner(member) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            disabled={rowBusy}
                            render={<Button variant="ghost" size="icon-sm" />}
                            className="text-muted-foreground data-[popup-open]:bg-accent data-[popup-open]:text-foreground"
                          >
                            <ChevronDown className="size-4" />
                            <span className="sr-only">Member options</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={4} className="w-44">
                            <DropdownMenuLabel>
                              {member.name || member.email}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {member.role !== "owner" ? (
                              <>
                                <DropdownMenuItem
                                  disabled={busy === `role-${member.userId}`}
                                  onClick={() => changeRole(member, "viewer")}
                                >
                                  <ShieldCheck className="size-4" />
                                  Make Viewer
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={busy === `role-${member.userId}`}
                                  onClick={() => changeRole(member, "editor")}
                                >
                                  <ShieldCheck className="size-4" />
                                  Make Editor
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={member.userId === meUserId}
                                  onClick={() => setConfirm({ kind: "transfer", member })}
                                >
                                  <Crown className="size-4" />
                                  Transfer ownership
                                </DropdownMenuItem>
                              </>
                            ) : null}
                            {member.role !== "owner" ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={member.userId === meUserId}
                                  onClick={() => setConfirm({ kind: "remove", member })}
                                >
                                  <Trash2 className="size-4" />
                                  Remove member
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <p className="mb-1.5 flex items-center gap-1.5 text-[0.62rem] font-[750] uppercase tracking-[0.08em] text-muted-foreground">
              <Mail className="size-3.5" />
              Pending invitations ({invitations.length})
            </p>
            {invitations.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-center text-sm text-muted-foreground">
                No pending invitations.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {invitations.map((inv) => (
                  <li key={inv.id} className="flex items-center gap-3 px-3 py-2.5">
                    <MemberAvatar email={inv.email} className="size-8" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {inv.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ROLE_LABEL[inv.role]} ·{" "}
                        {STATUS_LABEL[inv.status] ?? inv.status}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {inv.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={confirm?.kind === "remove"} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "remove" ? (
                <>
                  <span className="font-medium text-foreground">
                    {confirm.member.name || confirm.member.email}
                  </span>{" "}
                  will lose access to this project immediately. This can&apos;t
                  be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy !== null}
              onClick={confirmRemove}
            >
              {busy?.startsWith("remove-") ? "Removing…" : "Remove member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm?.kind === "transfer"} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer ownership?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "transfer" ? (
                <>
                  <span className="font-medium text-foreground">
                    {confirm.member.name || confirm.member.email}
                  </span>{" "}
                  will become the Owner and you&apos;ll become a Viewer. This
                  can&apos;t be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy !== null}
              onClick={confirmTransfer}
            >
              {busy?.startsWith("transfer-") ? "Transferring…" : "Transfer ownership"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
