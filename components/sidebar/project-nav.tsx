"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import type { ProjectDTO } from "@/lib/data-access";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateProjectDialog } from "./create-project-dialog";

/**
 * Shared sidebar project navigation (Task 0201).
 *
 * Data is fetched server-side (in the parent layout via `listProjectsForActor`)
 * and passed in, so the list stays consistent app-wide; after creation the
 * dialog calls the server action, navigates to the new project and refreshes
 * the layout so the entry appears here immediately.
 *
 * States handled: loading skeleton (Suspense fallback), load error, and the
 * empty "create a project" prompt. The active project is read from the
 * `?project=<id>` search param and highlighted.
 */
export function ProjectNav({
  projects,
  error,
}: {
  projects: ProjectDTO[] | null;
  error: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("project");
  const [open, setOpen] = React.useState(false);

  const loading = projects === null && !error;

  return (
    <SidebarGroup className="pb-4 pt-6">
      <div className="flex items-baseline justify-between gap-2 pr-1">
        <SidebarGroupLabel className="flex-1 px-2 text-[0.62rem] font-[750] uppercase tracking-[0.08em] text-[#c9cdfd]">
          Projects
        </SidebarGroupLabel>
        {projects && projects.length > 0 && (
          <span className="text-[0.62rem] font-semibold text-[#c9cdfd]">
            {projects.length}
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

        {loading ? (
          <div className="space-y-1.5 px-2 pt-1.5">
            <Skeleton className="h-[34px] w-full rounded-lg bg-white/10" />
            <Skeleton className="h-[34px] w-full rounded-lg bg-white/10" />
          </div>
        ) : error ? (
          <p className="px-3 pt-1.5 text-xs leading-5 text-[#ffab9c]">
            {error}
          </p>
        ) : projects && projects.length > 0 ? (
          <SidebarMenu className="pt-1">
            {projects.map((project) => {
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

      <CreateProjectDialog open={open} onOpenChange={setOpen} />
    </SidebarGroup>
  );
}

/** Loading fallback shown while the projects query is suspended. */
export function ProjectNavSkeleton() {
  return (
    <SidebarGroup className="pb-4 pt-6">
      <SidebarGroupLabel className="px-2 text-[0.62rem] font-[750] uppercase tracking-[0.08em] text-[#c9cdfd]">
        Projects
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="space-y-1.5 px-2 pt-1.5">
          <Skeleton className="h-[34px] w-full rounded-lg bg-white/10" />
          <Skeleton className="h-[34px] w-full rounded-lg bg-white/10" />
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
