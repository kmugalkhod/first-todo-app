import { redirect } from "next/navigation";
import { FolderKanban } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  getProject,
  listAccessibleTasks,
  listInboxTasks,
  listLabelsInProject,
  listActivity,
  listCommentsForTask,
  listMembers,
  listSections,
  listTaskLabelIds,
  listTasksInProject,
  listProjectsForActor,
  searchAccessibleWork,
} from "@/lib/data-access";
import { Taskspace } from "@/components/taskspace/taskspace";
import { DailyTaskList } from "@/components/taskspace/daily-task-list";
import { TimezoneSync } from "@/components/taskspace/timezone-sync";
import type { TaskGroup, TaskRowData } from "@/components/taskspace/types";
import { localDayBounds } from "@/lib/date-boundaries";

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

function basicRows(tasks: Awaited<ReturnType<typeof listAccessibleTasks>>, today = startOfToday()): TaskRowData[] {
  return tasks.map((task) => ({ id: task.id, title: task.title, description: task.description, status: task.status, priority: task.priority, labels: [], sectionId: task.sectionId, scheduledFor: task.scheduledFor?.toISOString() ?? null, overdue: task.status === "active" && !!task.scheduledFor && task.scheduledFor.getTime() < today, owner: null }));
}

export default async function TaskspaceHome({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; view?: string; q?: string; tz?: string }>;
}) {
  const currentUser = await getCurrentUser();
  // The protected layout already redirects, but keep the guard for safety.
  if (!currentUser) redirect("/sign-in");

  const { user } = currentUser;
  const actor = { id: user.id, email: user.email };
  const { project, view, q, tz } = await searchParams;
  const projectId = project ?? null;

  if (view === "inbox") {
    const [inbox, projects] = await Promise.all([listInboxTasks(actor), listProjectsForActor(actor)]);
    return <><TimezoneSync /><DailyTaskList title="Inbox" description="Capture work privately, then move it into a project when it is ready." tasks={basicRows(inbox)} inbox projects={projects.map((item) => ({ id: item.id, name: item.name }))} empty="Your Inbox is clear. Capture the next thing that comes to mind." /></>;
  }
  if (view === "today" || view === "upcoming") {
    let bounds: { start: Date; end: Date };
    try { bounds = localDayBounds(tz || "UTC"); } catch { bounds = localDayBounds("UTC"); }
    const scoped = await listAccessibleTasks(actor, { scope: view, start: bounds.start, end: bounds.end });
    return <><TimezoneSync /><DailyTaskList title={view === "today" ? "Today" : "Upcoming"} description={view === "today" ? "Scheduled work and anything overdue." : "Future work, ordered by planned date and priority."} tasks={basicRows(scoped, bounds.start.getTime())} empty={view === "today" ? "You’re all caught up." : "Nothing scheduled."} /></>;
  }
  if (view === "search") {
    const result = q ? await searchAccessibleWork(actor, q) : { projects: [], tasks: [] };
    return <main className="px-4 py-6 sm:px-8"><h1 className="font-heading text-3xl tracking-[-0.04em] text-foreground">Search</h1><form className="mt-5"><label className="sr-only" htmlFor="work-search">Search accessible tasks and projects</label><input id="work-search" name="q" defaultValue={q ?? ""} placeholder="Search tasks and projects" className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)]" /></form>{q ? <><h2 className="mt-8 text-sm font-semibold">Projects</h2>{result.projects.length ? <ul className="mt-2 text-sm">{result.projects.map((item) => <li key={item.id}><a className="text-primary underline" href={`/?project=${item.id}`}>{item.name}</a></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No accessible projects match.</p>}<div className="mt-6"><DailyTaskList title="Tasks" description="" tasks={basicRows(result.tasks)} empty="No accessible tasks match." /></div></> : <p className="mt-5 text-sm text-muted-foreground">Search task titles, descriptions, and project names.</p>}</main>;
  }

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

  // The shared workboard must not disappear because a secondary decoration
  // (activity, labels, member avatar or a comment) fails to load. Keep the
  // essential project/section/task read together, then degrade optional data
  // locally so the user can still see and manage the actual work.
  let loadedProject: Awaited<ReturnType<typeof getProject>>;
  let sections: Awaited<ReturnType<typeof listSections>>;
  let tasks: Awaited<ReturnType<typeof listTasksInProject>>;
  try {
    [loadedProject, sections, tasks] = await Promise.all([
      getProject(actor, projectId),
      listSections(actor, projectId),
      listTasksInProject(actor, projectId, { includeCompleted: true }),
    ]);
  } catch {
    return <main className="px-4 py-10 sm:px-9"><section className="max-w-xl border-y border-dashed border-border py-10"><h1 className="font-heading text-2xl tracking-[-0.04em] text-foreground">Your project couldn’t load.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Refresh the page to retry. Your work has not been changed.</p></section></main>;
  }

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

  const [labels, members, activity] = await Promise.all([
    listLabelsInProject(actor, projectId).catch(() => []),
    listMembers(actor, projectId).catch(() => []),
    listActivity(actor, projectId, { limit: 100 }).catch(() => []),
  ]);
  const labelById = new Map(labels.map((label) => [label.id, label]));
  const activeMemberById = new Map(
    members
      .filter((member) => member.status === "active")
      .map((member) => [member.userId, member]),
  );
  const todayStart = startOfToday();

  const rows: TaskRowData[] = await Promise.all(
    tasks.map(async (task) => {
      const [labelIds, comments] = await Promise.all([
        listTaskLabelIds(actor, task.id).catch(() => []),
        listCommentsForTask(actor, task.id).catch(() => []),
      ]);
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
        parentTaskId: task.parentTaskId,
        subtaskProgress: (() => { const children = tasks.filter((child) => child.parentTaskId === task.id); return children.length ? { completed: children.filter((child) => child.status === "completed").length, total: children.length } : undefined; })(),
        subtasks: tasks.filter((child) => child.parentTaskId === task.id).map((child) => ({ id: child.id, title: child.title, status: child.status })),
        comments: comments.map((comment) => ({ id: comment.id, authorId: comment.author?.id ?? null, author: comment.author?.name ?? "Unknown member", body: comment.body, createdAt: comment.createdAt.toISOString() })),
        activity: activity.filter((event) => event.taskId === task.id).slice(0, 8).map((event) => ({ id: event.id, actor: event.actor?.name ?? "Unknown member", action: event.action.replaceAll("_", " "), createdAt: event.createdAt.toISOString() })),
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
        labels={labels.map((label) => ({ id: label.id, name: label.name }))}
        members={members.filter((member) => member.status === "active").map((member) => ({ id: member.userId, name: member.name ?? member.email }))}
        canModerateComments={loadedProject.myRole === "owner"}
      />
    </main>
  );
}
