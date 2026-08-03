"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  PencilLine,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import type { ProjectDTO } from "@/lib/data-access";
import {
  archiveProjectAction,
  getProjectAction,
  restoreProjectAction,
} from "@/lib/server-actions/projects";
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
export function ProjectHeader({ userId }: { userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const [project, setProject] = React.useState<ProjectDTO | null>(null);
  const [error, setError] = React.useState<{
    projectId: string;
    message: string;
  } | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Dialogs owned by this header.
  const [editOpen, setEditOpen] = React.useState(false);
  const [membersOpen, setMembersOpen] = React.useState(false);
  const [archiveConfirm, setArchiveConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!projectId) return;
    let active = true;
    getProjectAction(projectId).then((res) => {
      if (!active) return;
      if (res.ok) {
        setProject(res.data);
        setError(null);
      } else {
        setProject(null);
        setError({
          projectId,
          message: res.error.message ?? "Couldn't load this project.",
        });
      }
    });
    return () => {
      active = false;
    };
  }, [projectId, reloadKey]);

  if (!projectId) return null;

  // Loading is derived: we're loading whenever a project is selected but its
  // data hasn't landed yet (so switching projects cleanly shows the skeleton
  // instead of stale content or a stale error).
  const loading =
    projectId !== null &&
    project?.id !== projectId &&
    error?.projectId !== projectId;
  const currentError = error?.projectId === projectId ? error.message : null;
  const isOwner = project?.myRole === "owner";
  const isArchived = project?.status === "archived";

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

  // --- Loading state -------------------------------------------------------
  if (loading) {
    return (
      <div className="border-b border-border/60 px-4 py-6 sm:px-8 sm:py-8">
        <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
        <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded bg-muted/70" />
      </div>
    );
  }

  // --- Error state ---------------------------------------------------------
  if (!project || currentError) {
    return (
      <div className="border-b border-border/60 px-4 py-6 sm:px-8">
        <p className="text-sm leading-6 text-muted-foreground">
          {currentError ?? "Couldn't load this project."}
        </p>
      </div>
    );
  }

  // --- Archived (read-only) header ------------------------------------------
  if (isArchived) {
    return (
      <div className="border-b border-border/60 px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
                {project.name}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[0.62rem] font-[750] uppercase tracking-[0.08em] text-muted-foreground">
                <Archive className="size-3" />
                Archived
              </span>
            </div>
            {project.description ? (
              <p className="max-w-xl text-[0.95rem] leading-7 text-muted-foreground">
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
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          This project is archived and read-only. Restore it to bring it back
          into your active views.
        </p>
      </div>
    );
  }

  // --- Active header + Owner-only manage menu --------------------------------
  return (
    <div className="border-b border-border/60 px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
            {project.name}
          </h1>
          {project.description ? (
            <p className="mt-3 max-w-xl text-[0.95rem] leading-7 text-muted-foreground">
              {project.description}
            </p>
          ) : null}
        </div>

        {isOwner ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" />}
              className="shrink-0"
            >
              <Settings2 className="size-4" />
              Manage
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
        onChanged={() => setReloadKey((k) => k + 1)}
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
