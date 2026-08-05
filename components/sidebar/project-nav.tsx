"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

import type { ProjectDTO } from "@/lib/data-access";
import { restoreProjectAction } from "@/lib/server-actions/projects";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CreateProjectDialog } from "./create-project-dialog";

/**
 * Shared sidebar project navigation (Task 0201).
 *
 * Data is fetched server-side (in the parent layout via `listProjectsForActor`)
 * and passed in, so the list stays consistent app-wide; after creation the
 * dialog calls the server action, navigates to the new project and refreshes
 * the layout so the entry appears here immediately. The project list is
 * resolved server-side before the layout renders, so no loading placeholder is
 * needed in the list.
 *
 * States handled: load error and the empty "create a project" prompt. The
 * active project is read from the `?project=<id>` search param and highlighted.
 */
export function ProjectNav({
  projects,
  archived,
  error,
}: {
  projects: ProjectDTO[] | null;
  error: string | null;
  /** Archived projects shown read-only with a restore affordance (Task 0206). */
  archived?: ProjectDTO[] | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("project");
  const [open, setOpen] = React.useState(false);
  const [pendingProjectId, setPendingProjectId] = React.useState<string | null>(
    null,
  );
  if (pendingProjectId !== null && pendingProjectId === activeId) {
    setPendingProjectId(null);
  }
  const focusedProjectId = pendingProjectId ?? activeId;
  // Projects created in this session but not yet returned by the server-fetched
  // `projects` prop (which is refreshed separately). Kept as an overlay so a
  // newly created project appears immediately instead of waiting for a manual
  // refresh (Task 0201 Recommendation: update optimistically after creation).
  const [extras, setExtras] = React.useState<ProjectDTO[]>([]);

  React.useEffect(() => {
    const openProjectDialog = () => setOpen(true);
    window.addEventListener("taskspace:new-project", openProjectDialog);
    return () => window.removeEventListener("taskspace:new-project", openProjectDialog);
  }, []);

  // Server list + optimistic extras, deduped by id (the extras drop out once
  // the refreshed server list includes them).
  const combined = React.useMemo(() => {
    const ids = new Set((projects ?? []).map((project) => project.id));
    return [
      ...extras.filter((extra) => !ids.has(extra.id)),
      ...(projects ?? []),
    ];
  }, [projects, extras]);

  function handleCreated(project: ProjectDTO) {
    setExtras((prev) =>
      prev.some((extra) => extra.id === project.id)
        ? prev
        : [project, ...prev],
    );
  }

  function prepareProjectNavigation(
    event: React.MouseEvent<HTMLAnchorElement>,
    project: ProjectDTO,
  ) {
    if (
      project.id === focusedProjectId ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }
    setPendingProjectId(project.id);
    window.dispatchEvent(
      new CustomEvent<string>("taskspace:project-switch", {
        detail: project.name,
      }),
    );
  }

  function prefetchProject(projectId: string) {
    router.prefetch(`/?project=${projectId}`);
  }

  async function handleRestore(project: ProjectDTO) {
    const res = await restoreProjectAction(project.id);
    if (!res.ok) {
      toast.error(res.error.message ?? "Couldn't restore the project.");
      return;
    }
    toast.success("Project restored");
    // The layout re-fetches both lists on refresh, so the project drops from
    // the archived area and reappears in the active list.
    router.refresh();
  }

  return (
    <>
      <SidebarGroup className="pb-4 pt-6">
      <div className="flex items-baseline justify-between gap-2 pr-1">
        <SidebarGroupLabel className="flex-1 px-2 text-[length:var(--taskspace-font-size-micro)] font-[var(--taskspace-weight-label)] uppercase tracking-[var(--taskspace-tracking-label)] text-[var(--taskspace-on-cobalt-muted)]">
          Projects
        </SidebarGroupLabel>
        {combined.length > 0 && (
          <span className="text-[length:var(--taskspace-font-size-micro)] font-semibold text-[var(--taskspace-on-cobalt-muted)]">
            {combined.length}
          </span>
        )}
      </div>

      <SidebarGroupContent>
        {error ? (
          <p className="px-3 pt-1.5 text-xs leading-5 text-[color-mix(in_srgb,var(--taskspace-coral)_62%,#fff)]">
            {error}
          </p>
        ) : combined.length > 0 ? (
          <SidebarMenu className="max-h-[204px] overflow-y-auto pt-1 pr-1">
            {combined.map((project) => {
              const active = project.id === focusedProjectId;
              return (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton
                    isActive={active}
                    render={<Link
                      href={`/?project=${project.id}`}
                      onClick={(event) => prepareProjectNavigation(event, project)}
                      onMouseEnter={() => prefetchProject(project.id)}
                      onFocus={() => prefetchProject(project.id)}
                    />}
                    className="h-[34px] gap-[9px] rounded-[var(--taskspace-radius-control)] px-2.5 text-[length:var(--taskspace-font-size-body)] font-[var(--taskspace-weight-nav)] text-[var(--taskspace-on-cobalt)] transition-colors hover:bg-white/10 hover:text-[var(--taskspace-on-cobalt)] data-[active=true]:bg-white/15"
                  >
                    <span
                      aria-hidden="true"
                      className="size-[9px] shrink-0 -rotate-45 rounded-[3px] bg-[var(--taskspace-citron)]"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {project.name}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        ) : (
          <p className="px-3 pt-1.5 text-xs leading-5 text-[var(--taskspace-on-cobalt-muted)]/75">
            Create a project to bring teammates together.
          </p>
        )}
      </SidebarGroupContent>

      <CreateProjectDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={handleCreated}
      />
    </SidebarGroup>

    {archived && archived.length > 0 ? (
      <SidebarGroup className="pb-4 pt-2">
        <div className="flex items-baseline justify-between gap-2 pr-1">
          <SidebarGroupLabel className="flex-1 px-2 text-[length:var(--taskspace-font-size-micro)] font-[var(--taskspace-weight-label)] uppercase tracking-[var(--taskspace-tracking-label)] text-[var(--taskspace-on-cobalt-muted)]">
            <Archive className="mr-1.5 inline size-3.5" />
            Archived
          </SidebarGroupLabel>
          <span className="text-[length:var(--taskspace-font-size-micro)] font-semibold text-[var(--taskspace-on-cobalt-muted)]">
            {archived.length}
          </span>
        </div>
        <SidebarGroupContent>
          <SidebarMenu className="pt-1">
            {archived.map((project) => (
              <SidebarMenuItem key={project.id}>
                <SidebarMenuButton
                  isActive={project.id === focusedProjectId}
                  render={<Link
                    href={`/?project=${project.id}`}
                    onClick={(event) => prepareProjectNavigation(event, project)}
                    onMouseEnter={() => prefetchProject(project.id)}
                    onFocus={() => prefetchProject(project.id)}
                  />}
                  className="h-[34px] gap-[9px] rounded-lg px-2.5 text-[length:var(--taskspace-font-size-body)] font-[var(--taskspace-weight-nav)] text-[var(--taskspace-on-cobalt-muted)]/85 hover:bg-white/10 hover:text-[var(--taskspace-on-cobalt)] data-[active=true]:bg-white/15"
                >
                  <span
                    aria-hidden="true"
                    className="size-[9px] shrink-0 -rotate-45 rounded-[3px] bg-[var(--taskspace-on-cobalt-muted)]/70"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {project.name}
                  </span>
                  {project.myRole === "owner" ? (
                    <button
                      type="button"
                      aria-label={`Restore ${project.name}`}
                      title="Restore project"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleRestore(project);
                      }}
                      className="flex size-6 shrink-0 items-center justify-center rounded-md text-[var(--taskspace-on-cobalt-muted)] transition-colors hover:bg-white/15 hover:text-[var(--taskspace-citron)]"
                    >
                      <ArchiveRestore className="size-3.5" />
                    </button>
                  ) : null}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    ) : null}
    </>
  );
}
