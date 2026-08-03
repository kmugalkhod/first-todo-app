import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listProjectsForActor, type ProjectDTO } from "@/lib/data-access";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import {
  ProjectNav,
  ProjectNavSkeleton,
} from "@/components/sidebar/project-nav";
import { ModeToggle } from "@/feature/components/toggle";
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
 * The sidebar's project list is fetched server-side here (`listProjectsForActor`)
 * and passed into the shared ProjectNav so it stays consistent app-wide. It is
 * wrapped in Suspense so the shared layout can stream while the query runs.
 */
async function ProjectsProvider({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  let projects: ProjectDTO[] | null = null;
  let error: string | null = null;

  try {
    projects = await listProjectsForActor({ id: userId, email });
  } catch {
    error = "Couldn't load your projects. Please try again.";
  }

  return <ProjectNav projects={projects} error={error} />;
}

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

  return (
    <SidebarProvider>
      <AppSidebar user={user}>
        <Suspense fallback={<ProjectNavSkeleton />}>
          <ProjectsProvider userId={user.id} email={user.email} />
        </Suspense>
      </AppSidebar>
      <SidebarInset className="min-h-svh bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/80 bg-background/95 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" />
            <div className="hidden h-5 w-px bg-border sm:block" />
            <p className="hidden text-sm font-medium text-muted-foreground sm:block">
              Your day, in focus
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <ModeToggle />
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
