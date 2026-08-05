"use client";

import { ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";

type BreadcrumbProject = {
  id: string;
  name: string;
};

/** Keeps the persistent topbar oriented to the project currently in view. */
export function ProjectBreadcrumb({
  projects,
}: {
  projects: BreadcrumbProject[];
}) {
  const params = useSearchParams();
  const activeProject = projects.find(
    (project) => project.id === params.get("project"),
  );

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden min-w-0 items-center gap-1.5 text-[length:var(--taskspace-font-size-micro)] font-[var(--taskspace-weight-label)] uppercase tracking-[var(--taskspace-tracking-label)] min-[801px]:flex"
    >
      <span className="text-muted-foreground">Projects</span>
      {activeProject ? (
        <>
          <ChevronRight
            aria-hidden="true"
            className="size-3 shrink-0 text-border"
          />
          <span className="max-w-44 truncate text-foreground">
            {activeProject.name}
          </span>
        </>
      ) : null}
    </nav>
  );
}
