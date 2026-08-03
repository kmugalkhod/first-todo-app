"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, ArchiveRestore, Plus } from "lucide-react";
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
  // Projects created in this session but not yet returned by the server-fetched
  // `projects` prop (which is refreshed separately). Kept as an overlay so a
  // newly created project appears immediately instead of waiting for a manual
  // refresh (Task 0201 Recommendation: update optimistically after creation).
  const [extras, setExtras] = React.useState<ProjectDTO[]>([]);

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
        <SidebarGroupLabel className="flex-1 px-2 text-[0.62rem] font-[750] uppercase tracking-[0.08em] text-[#c9cdfd]">
          Projects
        </SidebarGroupLabel>
        {combined.length > 0 && (
          <span className="text-[0.62rem] font-semibold text-[#c9cdfd]">
            {combined.length}
          </span>
        )}
      </div>

      <SidebarGroupContent>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mb-2 flex h-10 w-full items-center justify-between rounded-lg border border-white/25 bg-white/10 px-3 text-[0.75rem] font-[760] text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff765d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#3543d6]"
        >
          <span>New project</span>
          <span
            aria-hidden="true"
            className="flex size-[19px] shrink-0 items-center justify-center rounded-full bg-[#edff81] text-[#202550]"
          >
            <Plus className="size-3" strokeWidth={3} />
          </span>
        </button>

        {error ? (
          <p className="px-3 pt-1.5 text-xs leading-5 text-[#ffab9c]">
            {error}
          </p>
        ) : combined.length > 0 ? (
          <SidebarMenu className="pt-1">
            {combined.map((project) => {
              const active = project.id === activeId;
              return (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton
                    isActive={active}
                    onClick={() => router.push(`/?project=${project.id}`)}
                    className="h-[34px] gap-[9px] rounded-lg px-2.5 text-[0.74rem] font-[650] text-[#e1e3ff] hover:bg-white/10 hover:text-[#e1e3ff] data-[active=true]:bg-white/15"
                  >
                    <span
                      aria-hidden="true"
                      className="size-[9px] shrink-0 -rotate-45 rounded-[3px] bg-[#edff81]"
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
          <p className="px-3 pt-1.5 text-xs leading-5 text-[#c9cdfd]/75">
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
          <SidebarGroupLabel className="flex-1 px-2 text-[0.62rem] font-[750] uppercase tracking-[0.08em] text-[#c9cdfd]">
            <Archive className="mr-1.5 inline size-3.5" />
            Archived
          </SidebarGroupLabel>
          <span className="text-[0.62rem] font-semibold text-[#c9cdfd]">
            {archived.length}
          </span>
        </div>
        <SidebarGroupContent>
          <SidebarMenu className="pt-1">
            {archived.map((project) => (
              <SidebarMenuItem key={project.id}>
                <SidebarMenuButton
                  isActive={project.id === activeId}
                  onClick={() => router.push(`/?project=${project.id}`)}
                  className="h-[34px] gap-[9px] rounded-lg px-2.5 text-[0.74rem] font-[650] text-[#c9cdfd]/85 hover:bg-white/10 hover:text-[#e1e3ff] data-[active=true]:bg-white/15"
                >
                  <span
                    aria-hidden="true"
                    className="size-[9px] shrink-0 -rotate-45 rounded-[3px] bg-[#c9cdfd]/70"
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
                      className="flex size-6 shrink-0 items-center justify-center rounded-md text-[#c9cdfd] transition-colors hover:bg-white/15 hover:text-[#edff81]"
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
