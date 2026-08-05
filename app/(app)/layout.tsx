import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { Search } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listProjectsForActor, type ProjectDTO } from "@/lib/data-access";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { MobileWorkNav } from "@/components/sidebar/mobile-work-nav";
import { ProjectBreadcrumb } from "@/components/sidebar/project-breadcrumb";
import { ProjectNav } from "@/components/sidebar/project-nav";
import { TaskCaptureButton } from "@/components/taskspace/task-capture-button";
import { TaskCaptureProvider } from "@/components/taskspace/task-capture-context";
import { WorkspaceShortcuts } from "@/components/taskspace/workspace-shortcuts";
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
    <SidebarProvider style={{ "--sidebar-width": "238px" } as CSSProperties} className="taskspace-shell bg-[var(--taskspace-canvas)]">
      <AppSidebar user={user}>
        <ProjectNav projects={projects} archived={archived} error={error} />
      </AppSidebar>
      <SidebarInset className="min-h-svh bg-background">
        <TaskCaptureProvider>
          <WorkspaceShortcuts />
          <header className="taskspace-topbar flex min-h-[66px] shrink-0 items-center gap-3 border-b border-border bg-[var(--taskspace-paper)] px-4 sm:px-7">
            <span className="taskspace-mobile-mark relative size-[15px] shrink-0 rotate-45 rounded-[var(--taskspace-radius-chip)] bg-[var(--taskspace-cobalt)] shadow-[6px_6px_0_-3px_var(--taskspace-citron)]" aria-hidden="true" />
            <SidebarTrigger className="taskspace-sidebar-trigger size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" />
            <ProjectBreadcrumb projects={projects ?? []} />
            <form action="/" className="relative ml-auto w-full max-w-80 sm:w-[min(320px,30vw)]">
              <input type="hidden" name="view" value="search" />
              <label className="sr-only" htmlFor="workspace-search">Search tasks and projects</label>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
              <input id="workspace-search" name="q" type="search" aria-keyshortcuts="/" placeholder="Search tasks and projects" className="h-[35px] w-full rounded-[var(--taskspace-radius-control)] border border-border bg-background py-0 pl-8 pr-9 text-[length:var(--taskspace-font-size-body)] text-foreground placeholder:text-muted-foreground transition-[border-color,background-color] [transition-duration:var(--taskspace-motion-fast)] focus-visible:border-[var(--taskspace-cobalt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)]" />
              <kbd aria-hidden="true" className="pointer-events-none absolute right-2.5 top-2 flex size-5 items-center justify-center rounded-[var(--taskspace-radius-chip)] border border-border bg-[var(--taskspace-paper)] text-[length:var(--taskspace-font-size-micro)] font-extrabold text-[var(--taskspace-muted)]">/</kbd>
            </form>
            <TaskCaptureButton />
          </header>
          <div className="flex-1 pb-[76px] min-[801px]:pb-0">
            {children}
          </div>
        </TaskCaptureProvider>
        <MobileWorkNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
