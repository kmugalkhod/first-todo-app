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

  // Prototype-Final match: the project's real people power the heading's meta
  // bar (DESIGN.md). Active members drive the avatar stack + count; the owner
  // is named so the workspace reads as a shared, owned space from the first
  // viewport (matching the taskspace-momentum-prototype's exposed member row).
  const activeMembers = members.filter((member) => member.status === "active");
  const owner = activeMembers.find((member) => member.role === "owner");
  const ownerName = owner ? (owner.name ?? owner.email) : null;
  const memberLabel =
    activeMembers.length === 1 ? "1 member" : `${activeMembers.length} members`;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-8">
      <header className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-[0.66rem] font-bold uppercase tracking-[0.09em] text-[#8790ac] dark:text-muted-foreground">
            Projects
          </p>
          <h1 className="font-heading mt-2 text-5xl font-extrabold leading-[0.94] tracking-[-0.06em] text-[#202550] dark:text-foreground sm:text-6xl">
            {loadedProject.name}
          </h1>
          {loadedProject.description ? (
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#69718d] dark:text-muted-foreground">
              {loadedProject.description}
            </p>
          ) : null}
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-[#dfe2ef] py-3 text-[0.68rem] font-bold text-[#6d7594] dark:border-[#2a2f4a] dark:text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="flex -space-x-1.5">
            {activeMembers.slice(0, 4).map((member) => (
              <span
                key={member.userId}
                title={member.name ?? member.email}
                className="grid size-6 place-items-center rounded-full border-2 border-[#fbfbff] bg-[#a9b0ee] text-[0.6rem] font-extrabold text-[#202550] dark:border-[#1f2346] dark:bg-[#3a428f] dark:text-[#dfe1ff]"
              >
                {(member.name ?? member.email).charAt(0).toUpperCase()}
              </span>
            ))}
          </span>
          <span>{memberLabel}</span>
        </span>
        {ownerName ? <span>Owner · {ownerName}</span> : null}
        {canEdit ? null : (
          <span className="flex items-center gap-1.5">
            <i aria-hidden="true" className="size-1.5 rounded-full bg-[#ff765d]" />
            View-only
          </span>
        )}
      </div>

      <div className="mt-4">
        <Taskspace
          projectId={projectId}
          projectName={loadedProject.name}
          meUserId={user.id}
          canEdit={canEdit}
          groups={groups}
        />
      </div>
    </main>
  );
}
