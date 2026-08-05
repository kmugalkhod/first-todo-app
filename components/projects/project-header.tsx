"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Ellipsis,
  PencilLine,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import type { ProjectDTO } from "@/lib/data-access";
import {
  archiveProjectAction,
  restoreProjectAction,
} from "@/lib/server-actions/projects";
import { MemberAvatar } from "@/components/members/member-avatar";
import { MembersDialog } from "@/components/members/members-dialog";
import { ProjectEditDialog } from "./project-edit-dialog";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ProjectActivitySummary = {
  actor: string;
  action: string;
  createdAt: string;
};

const ACTIVITY_COPY: Record<string, string> = {
  task_created: "added a task",
  task_updated: "updated a task",
  task_completed: "completed a task",
  task_reopened: "reopened a task",
  task_deleted: "deleted a task",
  task_assigned: "assigned a task",
  task_unassigned: "unassigned a task",
  comment_added: "added a comment",
  member_invited: "invited a teammate",
  member_accepted: "joined the project",
};

function relativeActivityTime(iso: string) {
  const elapsed = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Project header + Owner-only manage menu (Task 0206).
 *
 * Rendered in the protected app shell; it is **project-aware** via `?project=`.
 * - Active project: Archivo (display) title + description, with an Owner-only
 *   Manage menu (Edit name & description, Members & permissions, Transfer
 *   ownership → members dialog, Archive project).
 * - Archived project: read-only title with an "Archived" badge and a Restore
 *   affordance for the owner (hidden from the active header until restored).
 *
 * Every mutation calls a DAO-backed server action and then refreshes: the server
 * stays the source of truth (mirrors the members surface). Ownership is decided
 * server-side (project:admin); the UI only gates what it exposes.
 */
export function ProjectHeader({
  userId,
  project: serverProject,
  members = [],
  latestActivity,
}: {
  userId: string;
  project: ProjectDTO;
  members?: Array<{
    id: string;
    name: string;
    role: "owner" | "editor" | "viewer";
  }>;
  latestActivity?: ProjectActivitySummary | null;
}) {
  const router = useRouter();
  const [project, setProject] = React.useState<ProjectDTO>(serverProject);
  const [previousServerProject, setPreviousServerProject] =
    React.useState(serverProject);
  if (previousServerProject !== serverProject) {
    setPreviousServerProject(serverProject);
    setProject(serverProject);
  }

  // Dialogs owned by this header.
  const [editOpen, setEditOpen] = React.useState(false);
  const [membersOpen, setMembersOpen] = React.useState(false);
  const [archiveConfirm, setArchiveConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const isOwner = project.myRole === "owner";
  const isArchived = project.status === "archived";
  const roleLabel = project.myRole
    ? `${project.myRole.charAt(0).toUpperCase()}${project.myRole.slice(1)}`
    : "Member";
  const ownerName = members.find((member) => member.role === "owner")?.name;

  async function handleArchive() {
    if (!project) return;
    setBusy(true);
    const res = await archiveProjectAction(project.id);
    setBusy(false);
    setArchiveConfirm(false);
    if (!res.ok) {
      toast.error(res.error.message ?? "Couldn't archive the project.");
      return;
    }
    toast.success("Project archived");
    // An archived project leaves the active views; clear the selection and
    // converge the sidebar + any open clients on the fresh state.
    router.push("/");
    router.refresh();
  }

  async function handleRestore() {
    if (!project || !isOwner) return;
    setBusy(true);
    const res = await restoreProjectAction(project.id);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error.message ?? "Couldn't restore the project.");
      return;
    }
    toast.success("Project restored");
    setProject(res.data);
    router.refresh();
  }

  // --- Archived (read-only) header ------------------------------------------
  if (isArchived) {
    return (
      <div className="ts-gutter pb-[var(--taskspace-space-section)] pt-[var(--taskspace-space-content)]">
        <div className="flex flex-col gap-[var(--taskspace-space-compact)] sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col gap-[var(--taskspace-space-control)]">
            <div className="flex flex-wrap items-center gap-[var(--taskspace-space-control)]">
              <h1 className="ts-display">
                {project.name}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[length:var(--taskspace-font-size-micro)] font-[var(--taskspace-weight-label)] uppercase tracking-[var(--taskspace-tracking-label)] text-muted-foreground">
                <Archive className="size-3" />
                Archived
              </span>
            </div>
            {project.description ? (
              <p className="ts-body max-w-[570px]">
                {project.description}
              </p>
            ) : null}
          </div>
          {isOwner ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={handleRestore}
              className="shrink-0"
            >
              <ArchiveRestore className="size-4" />
              {busy ? "Restoring…" : "Restore project"}
            </Button>
          ) : null}
        </div>
        <p className="ts-body mt-[var(--taskspace-space-compact)]">
          This project is archived and read-only. Restore it to bring it back
          into your active views.
        </p>
      </div>
    );
  }

  // --- Active header + Owner-only manage menu --------------------------------
  return (
    <div className="ts-gutter pb-[var(--taskspace-space-control)] pt-[var(--taskspace-space-content)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="ts-display">
            {project.name}
          </h1>
          {project.description ? (
            <p className="mt-[var(--taskspace-space-compact)] max-w-[570px] text-[length:var(--taskspace-font-size-lede)] leading-[1.55] text-[var(--taskspace-muted)]">
              {project.description}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-[var(--taskspace-space-tight)]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMembersOpen(true)}
            className="h-[33px] rounded-[var(--taskspace-radius-control)] px-[var(--taskspace-space-control)] text-[length:var(--taskspace-font-size-body)] font-bold"
          >
            <Users className="size-[15px]" />
            Members
          </Button>
          {isOwner ? (
            <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="icon-sm" />}
              aria-label="Project options"
              title="Project options"
              className="h-[33px] w-[33px] shrink-0 rounded-[var(--taskspace-radius-control)]"
            >
              <Ellipsis className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="w-60">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <PencilLine className="size-4" />
                Edit name &amp; description
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMembersOpen(true)}>
                <Users className="size-4" />
                Members &amp; permissions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMembersOpen(true)}>
                <ShieldCheck className="size-4" />
                Transfer ownership
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setArchiveConfirm(true)}
              >
                <Archive className="size-4" />
                Archive project
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <div className="mt-[var(--taskspace-space-section)] flex flex-wrap items-center gap-x-[var(--taskspace-space-compact)] gap-y-[var(--taskspace-space-control)] border-y border-border py-[var(--taskspace-space-compact)] text-[length:var(--taskspace-font-size-body)] font-semibold text-[var(--taskspace-muted)]">
        <div className="flex items-center">
          <div className="flex -space-x-2">
            {members.slice(0, 4).map((member) => (
              <MemberAvatar
                key={member.id}
                name={member.name}
                isOwner={member.role === "owner"}
                ringClassName="ring-[var(--taskspace-paper)]"
                className="size-6"
              />
            ))}
          </div>
          <span className="ml-[var(--taskspace-space-tight)]">
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        </div>
        <span>{ownerName ? `Owner: ${ownerName}` : `Your access: ${roleLabel}`}</span>
        <span className="flex items-center gap-[var(--taskspace-space-tight)]">
          <i className="size-1.5 rounded-full bg-[var(--taskspace-coral)]" aria-hidden="true" />
          {latestActivity ? (
            <>
              {latestActivity.actor}{" "}
              {ACTIVITY_COPY[latestActivity.action] ??
                latestActivity.action.replaceAll("_", " ")}{" "}
              <time
                dateTime={latestActivity.createdAt}
                suppressHydrationWarning
              >
                {relativeActivityTime(latestActivity.createdAt)}
              </time>
            </>
          ) : (
            "Shared project"
          )}
        </span>
      </div>

      <ProjectEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        projectId={project.id}
        name={project.name}
        description={project.description}
        onSaved={(name, description) => {
          setProject((prev) =>
            prev ? { ...prev, name, description } : prev,
          );
        }}
      />
      <MembersDialog
        open={membersOpen}
        onOpenChange={setMembersOpen}
        projectId={project.id}
        meUserId={userId}
        onChanged={() => router.refresh()}
      />

      <AlertDialog
        open={archiveConfirm}
        onOpenChange={(v) => !v && setArchiveConfirm(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this project?</AlertDialogTitle>
            <AlertDialogDescription>
              {project.name} will be hidden from your active views but its data
              is preserved. You can restore it later from the sidebar. This
              isn&apos;t a permanent deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={handleArchive}
            >
              {busy ? "Archiving…" : "Archive project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
