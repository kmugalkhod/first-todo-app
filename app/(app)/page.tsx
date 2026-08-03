import { redirect } from "next/navigation";
import { FolderKanban } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  getProject,
  listLabelsInProject,
  listMembers,
  listSections,
  listTaskLabelIds,
  listTasksInProject,
} from "@/lib/data-access";
import { Taskspace } from "@/components/taskspace/taskspace";
import type { TaskGroup, TaskRowData } from "@/components/taskspace/types";

/**
 * Taskspace home (Story 03 — Task 0301).
 *
 * Reads the active project from `?project=` (set by the sidebar) and feeds the
 * server-fetched task data into the shared Taskspace client component: sections
 * + task rows + the coexisting detail record. This replaces the previous
 * hard-coded demo dashboard with a real, DAO-backed task list.
 *
 * The task row / list surface is the Story 03 core landing here; the derived
 * "Today / Upcoming / Search" views arrive in Story 04 and will reuse the same
 * `TaskRow` component.
 */

// Start of today (server clock) used to flag overdue tasks with coral attention.
function startOfToday(): number {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

export default async function TaskspaceHome({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const currentUser = await getCurrentUser();
  // The protected layout already redirects, but keep the guard for safety.
  if (!currentUser) redirect("/sign-in");

  const { user } = currentUser;
  const actor = { id: user.id, email: user.email };
  const { project } = await searchParams;
  const projectId = project ?? null;

  // No project selected yet — prompt the actor to pick one from the sidebar.
  if (!projectId) {
    return (
      <main className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-8">
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-card p-8">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FolderKanban className="size-5" />
          </span>
          <h1 className="font-heading text-xl font-semibold tracking-[-0.02em] text-foreground">
            Choose a project to get started
          </h1>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Pick a project from the sidebar to see and organise its tasks, or
            create a new project with the &ldquo;New project&rdquo; button.
          </p>
        </div>
      </main>
    );
  }

  const [loadedProject, sections, tasks, labels, members] = await Promise.all([
    getProject(actor, projectId),
    listSections(actor, projectId),
    listTasksInProject(actor, projectId, { includeCompleted: true }),
    listLabelsInProject(actor, projectId),
    listMembers(actor, projectId),
  ]);

  // Non-members / archived content falls back to the "pick a project" prompt.
  if (!loadedProject || loadedProject.status === "archived") {
    return (
      <main className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-8">
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-card p-8">
          <h1 className="font-heading text-xl font-semibold tracking-[-0.02em] text-foreground">
            This project isn&apos;t available
          </h1>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            It may have been archived or you may no longer be a member. Pick
            another project from the sidebar.
          </p>
        </div>
      </main>
    );
  }

  const labelById = new Map(labels.map((label) => [label.id, label]));
  const activeMemberById = new Map(
    members
      .filter((member) => member.status === "active")
      .map((member) => [member.userId, member]),
  );
  const todayStart = startOfToday();

  const rows: TaskRowData[] = await Promise.all(
    tasks.map(async (task) => {
      const labelIds = await listTaskLabelIds(actor, task.id);
      const ownerRow = task.assigneeId
        ? activeMemberById.get(task.assigneeId)
        : undefined;
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        labels: labelIds
          .map((id) => labelById.get(id))
          .filter((label): label is NonNullable<typeof label> => !!label)
          .map((label) => ({ id: label.id, name: label.name })),
        sectionId: task.sectionId,
        scheduledFor: task.scheduledFor
          ? task.scheduledFor.toISOString()
          : null,
        overdue:
          task.status === "active" &&
          task.scheduledFor != null &&
          task.scheduledFor.getTime() < todayStart,
        owner: ownerRow
          ? { id: ownerRow.userId, name: ownerRow.name ?? ownerRow.email }
          : null,
      };
    }),
  );

  // Order follows the server list (by position, then createdAt). Group into
  // project sections, plus a catch-all for tasks the actor didn't file away.
  const groups: TaskGroup[] = sections.map((section) => ({
    key: section.id,
    sectionId: section.id,
    label: section.name,
    tasks: rows.filter((row) => row.sectionId === section.id),
  }));

  const unsectioned = rows.filter((row) => row.sectionId == null);
  if (unsectioned.length > 0) {
    groups.push({
      key: "unsectioned",
      sectionId: null,
      label: loadedProject.name,
      tasks: unsectioned,
    });
  }

  const canEdit =
    loadedProject.myRole === "owner" || loadedProject.myRole === "editor";

  // The app shell's ProjectHeader already owns the project title, description
  // and Manage/Members actions (Rendered above `children` in the (app) layout).
  // This page renders only the task surface underneath it. To stay symmetrical
  // with that full-bleed header we use the same horizontal padding instead of a
  // narrow centred column — matching the prototype's flat, full-width .content.
  return (
    <main className="px-4 py-6 sm:px-8">
      <Taskspace
        projectId={projectId}
        projectName={loadedProject.name}
        meUserId={user.id}
        canEdit={canEdit}
        groups={groups}
      />
    </main>
  );
}
