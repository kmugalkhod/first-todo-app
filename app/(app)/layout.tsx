import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { Search } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listProjectsForActor, type ProjectDTO } from "@/lib/data-access";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ProjectNav } from "@/components/sidebar/project-nav";
import { TaskCaptureButton } from "@/components/taskspace/task-capture-button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

/**
 * Protected shell. Every route inside the `(app)` group requires an
 * authenticated session (unauthenticated visitors are redirected to sign-in)
 * and renders inside the shared Taskspace application shell — the cobalt
 * sidebar, action topbar and paper workspace persist across all protected
 * pages so navigation never tears down the frame.
 *
 * The sidebar's project list is fetched server-side here via
 * `listProjectsForActor` and passed into the shared ProjectNav so it stays
 * consistent app-wide. It is resolved before rendering (no Suspense boundary
 * around ProjectNav) so the client keeps its state across `router.refresh()`
 * — this is what lets a freshly created project stay visible immediately via
 * the optimistic update in ProjectNav.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/sign-in");
  }

  const { user } = currentUser;

  let projects: ProjectDTO[] | null = null;
  let archived: ProjectDTO[] | null = null;
  let error: string | null = null;

  try {
    // Active projects drive the main list and project header; archived ones are
    // shown read-only in a separate sidebar area with a restore affordance
    // (archived are excluded from the active list, PRD FR-2).
    projects = await listProjectsForActor({ id: user.id, email: user.email });
    archived = await listProjectsForActor(
      { id: user.id, email: user.email },
      { status: "archived" },
    );
  } catch {
    error = "Couldn't load your projects. Please try again.";
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "238px" } as CSSProperties} className="taskspace-shell bg-[var(--taskspace-canvas)] md:p-5">
      <AppSidebar user={user}>
        <ProjectNav projects={projects} archived={archived} error={error} />
      </AppSidebar>
      <SidebarInset className="min-h-svh bg-background md:min-h-[calc(100svh-2.5rem)] md:rounded-r-[var(--taskspace-radius-shell)] md:shadow-[var(--taskspace-shell-shadow)]">
        <header className="taskspace-topbar flex min-h-[66px] shrink-0 items-center gap-3 border-b border-border bg-[var(--taskspace-paper)] px-4 sm:px-7">
          <SidebarTrigger className="taskspace-sidebar-trigger size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" />
          <p className="hidden text-[0.62rem] font-[760] uppercase tracking-[0.08em] text-muted-foreground md:block">Projects</p>
          <form action="/" className="relative ml-auto w-full max-w-80 sm:w-[min(320px,30vw)]">
            <input type="hidden" name="view" value="search" />
            <label className="sr-only" htmlFor="workspace-search">Search tasks and projects</label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
            <input id="workspace-search" name="q" type="search" placeholder="Search tasks and projects" className="h-[35px] w-full rounded-md border border-border bg-background py-0 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)]" />
          </form>
          <TaskCaptureButton />
        </header>
        <div className="flex-1">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
