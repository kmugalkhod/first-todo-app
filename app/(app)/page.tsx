import { redirect } from "next/navigation";
import { FolderKanban } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  getProject,
  listAccessibleTasks,
  listInboxTasks,
  listLabelsInProject,
  listActivity,
  listCommentsInProject,
  listMembers,
  listSections,
  listTaskLabelIdsInProject,
  listTasksInProject,
  listProjectsForActor,
  searchAccessibleWork,
} from "@/lib/data-access";
import { Taskspace } from "@/components/taskspace/taskspace";
import { DailyTaskList } from "@/components/taskspace/daily-task-list";
import { SearchView } from "@/components/taskspace/search-view";
import {
  EmptyState,
  PageContainer,
  PageHeader,
} from "@/components/ui/page-shell";
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
    return (
      <SearchView
        query={q}
        projects={result.projects.map((item) => ({ id: item.id, name: item.name }))}
        tasks={basicRows(result.tasks)}
      />
    );
  }

  // No project selected yet — prompt the actor to pick one from the sidebar.
  if (!projectId) {
    return (
      <main>
        <PageContainer width="wide">
          <EmptyState
            icon={<FolderKanban className="size-5" />}
            title="Choose a project to get started"
            description="Pick a project from the sidebar to see and organise its tasks, or create a new project with the “New project” button."
          />
        </PageContainer>
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
    return (
      <main>
        <PageContainer width="wide">
          <PageHeader
            kicker="Taskspace"
            title="Your project couldn't load."
            description="Refresh the page to retry. Your work has not been changed."
          />
        </PageContainer>
      </main>
    );
  }

  // Non-members / archived content falls back to the "pick a project" prompt.
  if (!loadedProject || loadedProject.status === "archived") {
    return (
      <main>
        <PageContainer width="wide">
          <EmptyState
            icon={<FolderKanban className="size-5" />}
            title="This project isn't available"
            description="It may have been archived or you may no longer be a member. Pick another project from the sidebar."
          />
        </PageContainer>
      </main>
    );
  }

  const [labels, members, activity, taskLabelIds, comments] = await Promise.all([
    listLabelsInProject(actor, projectId).catch(() => []),
    listMembers(actor, projectId).catch(() => []),
    listActivity(actor, projectId, { limit: 100 }).catch(() => []),
    listTaskLabelIdsInProject(actor, projectId).catch(() => []),
    listCommentsInProject(actor, projectId).catch(() => []),
  ]);
  const labelById = new Map(labels.map((label) => [label.id, label]));
  const labelIdsByTask = new Map<string, string[]>();
  for (const { taskId, labelId } of taskLabelIds) {
    const labelIds = labelIdsByTask.get(taskId) ?? [];
    labelIds.push(labelId);
    labelIdsByTask.set(taskId, labelIds);
  }
  const commentsByTask = new Map<string, typeof comments>();
  for (const comment of comments) {
    const taskComments = commentsByTask.get(comment.taskId) ?? [];
    taskComments.push(comment);
    commentsByTask.set(comment.taskId, taskComments);
  }
  const childrenByParent = new Map<string, typeof tasks>();
  for (const child of tasks) {
    if (!child.parentTaskId) continue;
    const children = childrenByParent.get(child.parentTaskId) ?? [];
    children.push(child);
    childrenByParent.set(child.parentTaskId, children);
  }
  const activityByTask = new Map<string, typeof activity>();
  for (const event of activity) {
    if (!event.taskId) continue;
    const taskActivity = activityByTask.get(event.taskId) ?? [];
    if (taskActivity.length < 8) taskActivity.push(event);
    activityByTask.set(event.taskId, taskActivity);
  }
  const activeMemberById = new Map(
    members
      .filter((member) => member.status === "active")
      .map((member) => [member.userId, member]),
  );
  const todayStart = startOfToday();

  const rows: TaskRowData[] = tasks.map((task) => {
    const labelIds = labelIdsByTask.get(task.id) ?? [];
    const taskComments = commentsByTask.get(task.id) ?? [];
    const children = childrenByParent.get(task.id) ?? [];
    const taskActivity = activityByTask.get(task.id) ?? [];
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
      subtaskProgress: children.length
        ? {
            completed: children.filter((child) => child.status === "completed").length,
            total: children.length,
          }
        : undefined,
      subtasks: children.map((child) => ({
        id: child.id,
        title: child.title,
        status: child.status,
      })),
      comments: taskComments.map((comment) => ({
        id: comment.id,
        authorId: comment.author?.id ?? null,
        author: comment.author?.name ?? "Unknown member",
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
      })),
      activity: taskActivity.map((event) => ({
        id: event.id,
        actor: event.actor?.name ?? "Unknown member",
        action: event.action.replaceAll("_", " "),
        createdAt: event.createdAt.toISOString(),
      })),
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
  });

  // Order follows the server list (by position, then createdAt). Group into
  // project sections, plus a catch-all for tasks the actor didn't file away.
  // Child tasks belong in their parent's detail record, not alongside parents
  // in the project workboard. Keeping this list to direct tasks also prevents
  // newly created subtasks from appearing as duplicate top-level work.
  const directRows = rows.filter((row) => row.parentTaskId == null);

  const groups: TaskGroup[] = sections.map((section) => ({
    key: section.id,
    sectionId: section.id,
    label: section.name,
    tasks: directRows.filter((row) => row.sectionId === section.id),
  }));

  const unsectioned = directRows.filter((row) => row.sectionId == null);
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
    <main>
      <Taskspace
        key={projectId}
        projectId={projectId}
        projectName={loadedProject.name}
        project={loadedProject}
        meUserId={user.id}
        canEdit={canEdit}
        groups={groups}
        taskRecords={rows}
        labels={labels.map((label) => ({ id: label.id, name: label.name }))}
        members={members.filter((member) => member.status === "active").map((member) => ({ id: member.userId, name: member.name ?? member.email, role: member.role }))}
        latestActivity={activity[0] ? {
          actor: activity[0].actor?.name ?? "A teammate",
          action: activity[0].action,
          createdAt: activity[0].createdAt.toISOString(),
        } : null}
        canModerateComments={loadedProject.myRole === "owner"}
      />
    </main>
  );
}
