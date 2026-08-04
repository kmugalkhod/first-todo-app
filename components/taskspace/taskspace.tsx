"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  createSectionAction,
  removeSectionAction,
  renameSectionAction,
  reorderSectionsAction,
} from "@/lib/server-actions/sections";
import {
  completeTaskAction,
  createTaskAction,
  deleteTaskAction,
  reorderTasksAction,
  reopenTaskAction,
} from "@/lib/server-actions/tasks";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ProjectHeader } from "@/components/projects/project-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskDetailRecord } from "./task-detail-record";
import { TaskRow } from "./task-row";
import type { TaskGroup, TaskRowData } from "./types";
import type { ActionResult } from "@/lib/server-actions/types";

/**
 * Task 0301 — the sectioned task list + coexisting detail record (Taskspace).
 * Task 0302 — section management (add / rename / reorder / remove).
 *
 * Drives the paper task list from server-fetched `groups`:
 * - selecting a row shows its record in the right-hand panel without navigating
 *   away (DESIGN.md coexistence rule / wire-up to Task 0305),
 * - the completion control calls the DAO-backed actions with an optimistic
 *   update (never colour-only),
 * - each section carries the small citron "+ Add task" quick-add affordance
 *   (Task 0301 step 6),
 * - editors/owners can add, rename, reorder (up/down — accessible, no drag
 *   required) and remove sections (Task 0302; removing releases tasks to the
 *   project's catch-all bucket, never orphaning them).
 *
 * Mutations stay optimistic where shown and reconcile via `router.refresh()` so
 * the server remains the source of truth.
 */

/** Small focus/ring style shared by the section + quick-add controls. */
const CONTROL_CLASS =
  "flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff765d] focus-visible:ring-offset-1 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground";

export function Taskspace({
  projectId,
  projectName,
  meUserId,
  canEdit,
  groups,
  labels = [],
  members = [],
  canModerateComments = false,
}: {
  projectId: string;
  projectName: string;
  meUserId: string | null;
  canEdit: boolean;
  groups: TaskGroup[];
  labels?: Array<{ id: string; name: string }>;
  members?: Array<{ id: string; name: string }>;
  canModerateComments?: boolean;
}) {
  const router = useRouter();
  // The task record remains next to its list through tablet widths. It only
  // becomes a sheet at the design system's dedicated 620px sheet breakpoint.
  const isMobile = useIsMobile(620);
  const [state, setState] = React.useState(groups);
  const [selectedId, setSelectedId] = React.useState<string | null>(() => {
    for (const group of groups) {
      const active = group.tasks.find((task) => task.status === "active");
      if (active) return active.id;
    }
    return null;
  });
  const [composingKey, setComposingKey] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [busyIds, setBusyIds] = React.useState<ReadonlySet<string>>(
    new Set(),
  );
  const [showCompleted, setShowCompleted] = React.useState(false);

  // Section management (Task 0302) state.
  const [creatingSection, setCreatingSection] = React.useState(false);
  const [sectionDraft, setSectionDraft] = React.useState("");
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameDraft, setRenameDraft] = React.useState("");
  const [confirmingDelete, setConfirmingDelete] = React.useState<string | null>(
    null,
  );

  /**
   * Keep creation feeling immediate. The server action remains authoritative,
   * but a temporary row/section appears at once and is replaced by its real
   * record as soon as the action returns.
   */
  const openQuickAdd = React.useCallback(() => {
    const firstGroup =
      state.find((group) => group.sectionId !== null) ?? state[0];
    if (!firstGroup) {
      setCreatingSection(true);
      return;
    }
    setComposingKey(firstGroup.key);
    setDraft("");
  }, [state]);

  React.useEffect(() => {
    window.addEventListener("taskspace:new-task", openQuickAdd);
    return () => window.removeEventListener("taskspace:new-task", openQuickAdd);
  }, [openQuickAdd]);

  // Re-sync whenever the server sends a fresh snapshot (after a create /
  // toggle triggers `router.refresh()`), without resetting the selection.
  // Kept as render-time state adjustment (the React-recommended pattern) so the
  // React Compiler preserves optimisation.
  const [prevGroups, setPrevGroups] = React.useState(groups);
  if (prevGroups !== groups) {
    setPrevGroups(groups);
    setState(groups);
  }

  let selected: { task: TaskRowData; sectionName: string } | null = null;
  for (const group of state) {
    const task = group.tasks.find((t) => t.id === selectedId);
    if (task && (showCompleted || task.status === "active")) {
      selected = { task, sectionName: group.label };
      break;
    }
  }

  function withBusy(id: string, fn: () => void | Promise<void>) {
    setBusyIds((prev) => new Set(prev).add(id));
    void Promise.resolve(fn()).finally(() => {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  }

  /** Pump a section mutation through the busy guard + refresh on success. */
  function runSectionAction(
    busyKey: string,
    fn: () => Promise<ActionResult<unknown>>,
  ) {
    withBusy(busyKey, async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error.message ?? "Couldn't update the section.");
        return;
      }
      setCreatingSection(false);
      setRenamingId(null);
      setConfirmingDelete(null);
      router.refresh();
    });
  }

  async function toggleComplete(taskId: string, complete: boolean) {
    if (busyIds.has(taskId)) return;
    const previous = state;
    setState((prev) =>
      prev.map((group) => ({
        ...group,
        tasks: group.tasks.map((task) =>
          task.id === taskId
            ? { ...task, status: complete ? "completed" : "active" }
            : task,
        ),
      })),
    );
    if (complete && !showCompleted && selectedId === taskId) {
      setSelectedId(null);
    }
    withBusy(taskId, async () => {
      const res = complete
        ? await completeTaskAction(taskId)
        : await reopenTaskAction(taskId);
      if (!res.ok) {
        setState(previous);
        toast.error(res.error.message ?? "Couldn't update the task.");
        return;
      }
      router.refresh();
    });
  }

  /** Delete a task, removing it optimistically from the snapshot. */
  async function deleteTask(taskId: string) {
    if (busyIds.has(taskId)) return;
    const previous = state.map((group) => ({
      ...group,
      tasks: group.tasks.filter((task) => task.id !== taskId),
    }));
    setState(previous);
    if (selectedId === taskId) setSelectedId(null);
    withBusy(taskId, async () => {
      const res = await deleteTaskAction(taskId);
      if (!res.ok) {
        setState(groups);
        toast.error(res.error.message ?? "Couldn't delete the task.");
        return;
      }
      toast.success("Task deleted");
      router.refresh();
    });
  }

  async function submitQuickAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.trim();
    if (!title || !composingKey) return;

    const group = state.find((g) => g.key === composingKey);
    if (!group) return;

    const pendingId = `__pending_task_${Date.now()}`;
    const pendingTask: TaskRowData = {
      id: pendingId,
      title,
      description: null,
      status: "active",
      priority: "p4",
      labels: [],
      sectionId: group.sectionId,
      scheduledFor: null,
      overdue: false,
      owner: null,
    };
    setState((prev) =>
      prev.map((item) =>
        item.key === group.key
          ? { ...item, tasks: [...item.tasks, pendingTask] }
          : item,
      ),
    );
    setComposingKey(null);
    setDraft("");
    setSelectedId(pendingId);
    withBusy("__create__", async () => {
      const res = await createTaskAction(projectId, {
        title,
        sectionId: group.sectionId,
      });
      if (!res.ok) {
        setState((prev) =>
          prev.map((item) => ({
            ...item,
            tasks: item.tasks.filter((task) => task.id !== pendingId),
          })),
        );
        setSelectedId((current) => (current === pendingId ? null : current));
        toast.error(res.error.message ?? "Couldn't add the task.");
        return;
      }
      const task: TaskRowData = {
        id: res.data.id,
        title: res.data.title,
        description: res.data.description,
        status: res.data.status,
        priority: res.data.priority,
        labels: [],
        sectionId: res.data.sectionId,
        parentTaskId: res.data.parentTaskId,
        scheduledFor: res.data.scheduledFor?.toISOString() ?? null,
        overdue: false,
        owner: null,
      };
      setState((prev) =>
        prev.map((item) => ({
          ...item,
          tasks: item.tasks.map((itemTask) =>
            itemTask.id === pendingId ? task : itemTask,
          ),
        })),
      );
      setSelectedId(res.data.id);
      toast.success("Task added");
      router.refresh();
    });
  }

  function submitCreateSection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = sectionDraft.trim();
    if (!name) return;
    const pendingKey = `__pending_section_${Date.now()}`;
    setSectionDraft("");
    setCreatingSection(false);
    setState((prev) => [
      ...prev,
      { key: pendingKey, sectionId: pendingKey, label: name, tasks: [] },
    ]);
    withBusy("__new_section__", async () => {
      const result = await createSectionAction(projectId, { name });
      if (!result.ok) {
        setState((prev) => prev.filter((group) => group.key !== pendingKey));
        toast.error(result.error.message ?? "Couldn't create the section.");
        return;
      }
      setState((prev) =>
        prev.map((group) =>
          group.key === pendingKey
            ? {
                ...group,
                key: result.data.id,
                sectionId: result.data.id,
              }
            : group,
        ),
      );
      toast.success("Section added");
      router.refresh();
    });
  }

  function submitRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = renameDraft.trim();
    if (!name || !renamingId) return;
    runSectionAction(`__rename_${renamingId}`, () =>
      renameSectionAction(renamingId, name),
    );
  }

  function confirmDeleteSection(sectionId: string) {
    setConfirmingDelete(sectionId);
  }

  /** Remove the section at once, while preserving its tasks in No section. */
  function deleteSection(section: TaskGroup) {
    if (!section.sectionId || busyIds.has(`__delete_${section.sectionId}`)) return;
    const previous = state;
    const sectionId = section.sectionId;
    setConfirmingDelete(null);
    setState((current) => {
      const remaining = current.filter((group) => group.sectionId !== sectionId);
      if (!section.tasks.length) return remaining;
      const releasedTasks = section.tasks.map((task) => ({
        ...task,
        sectionId: null,
      }));
      const catchAllIndex = remaining.findIndex(
        (group) => group.sectionId === null,
      );
      if (catchAllIndex === -1) {
        return [
          ...remaining,
          {
            key: "unsectioned",
            sectionId: null,
            label: projectName,
            tasks: releasedTasks,
          },
        ];
      }
      return remaining.map((group, index) =>
        index === catchAllIndex
          ? { ...group, tasks: [...group.tasks, ...releasedTasks] }
          : group,
      );
    });
    withBusy(`__delete_${sectionId}`, async () => {
      const result = await removeSectionAction(sectionId);
      if (!result.ok) {
        setState(previous);
        toast.error(result.error.message ?? "Couldn't delete the section.");
        return;
      }
      toast.success("Section deleted");
      router.refresh();
    });
  }

  /** Move a real section up/down and persist the new order. */
  function moveSection(sectionId: string, delta: number) {
    const sectionIds = state
      .filter((g) => g.sectionId != null)
      .map((g) => g.sectionId as string);
    const index = sectionIds.indexOf(sectionId);
    const target = index + delta;
    if (index === -1 || target < 0 || target >= sectionIds.length) return;
    const next = [...sectionIds];
    [next[index], next[target]] = [next[target], next[index]];
    runSectionAction("__reorder__", () =>
      reorderSectionsAction(projectId, next),
    );
  }

  /** Reorder direct tasks without making drag-and-drop a prerequisite. */
  function moveTask(group: TaskGroup, taskId: string, direction: "up" | "down") {
    if (!group.sectionId && group.key !== "unsectioned") return;
    const index = group.tasks.findIndex((task) => task.id === taskId);
    const target = index + (direction === "up" ? -1 : 1);
    if (index < 0 || target < 0 || target >= group.tasks.length) return;
    const ordered = group.tasks.map((task) => task.id);
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    withBusy(`__task_order_${group.key}`, async () => {
      const result = await reorderTasksAction(projectId, group.sectionId, ordered);
      if (!result.ok) {
        toast.error(result.error.message ?? "Couldn't reorder the tasks.");
        return;
      }
      router.refresh();
    });
  }

  // The workspace is only "empty" when there are no sections and no tasks at
  // all — a section that the editor just created shows even while it holds zero
  // tasks, so the New section control stays visible instead of being masked.
  const hasSections = state.some((group) => group.sectionId != null);
  const hasActiveTasks = state.some((group) =>
    group.tasks.some((task) => task.status === "active"),
  );
  const isEmpty = !hasSections && !hasActiveTasks;
  // Completed-only projects should not render a stack of identical empty
  // sections. Keep a single calm entry point until the user opens completion
  // history or starts a new task.
  const isQuiet = !isEmpty && !showCompleted && !hasActiveTasks && !composingKey;
  const groupsToRender =
    !showCompleted && !hasActiveTasks && composingKey
      ? state.filter((group) => group.key === composingKey)
      : state;
  const sectionPendingDeletion = confirmingDelete
    ? state.find((group) => group.sectionId === confirmingDelete) ?? null
    : null;
  const sectionPendingRename = renamingId
    ? state.find((group) => group.sectionId === renamingId) ?? null
    : null;

  return (
    <div
      className={cn(
        "taskspace-workboard min-h-[calc(100svh-13rem)]",
        selected && "taskspace-workboard--with-detail",
      )}
    >
      <div className="min-w-0">
        <ProjectHeader userId={meUserId ?? ""} />
        <div className="px-4 pb-12 pt-6 sm:px-9">
        {isEmpty ? (
          <div className="flex flex-col items-start gap-3 border-y border-dashed border-border py-10">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ListChecks className="size-5" />
            </span>
            <h2 className="font-heading text-lg font-semibold tracking-[-0.02em] text-foreground">
              Nothing here yet
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Create your first section with &ldquo;New section&rdquo;, then add
              tasks with &ldquo;+ Add task&rdquo;.
            </p>
          </div>
        ) : isQuiet ? (
          <section className="border-y border-border py-6" aria-label="Open work">
            <h2 className="text-sm font-semibold tracking-[-0.025em] text-[var(--taskspace-ink)] dark:text-foreground">
              No open work
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-xs leading-5 text-[var(--taskspace-muted)] dark:text-muted-foreground">
                Completed tasks are kept below when you need them.
              </p>
              {canEdit ? (
                <button
                  type="button"
                  onClick={openQuickAdd}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[var(--taskspace-cobalt)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--taskspace-coral)]"
                >
                  <Plus className="size-3.5" />
                  Add task
                </button>
              ) : null}
            </div>
          </section>
        ) : (
          <div className="flex flex-col">
            {groupsToRender.map((group) => {
              const visibleTasks = showCompleted
                ? group.tasks
                : group.tasks.filter((task) => task.status === "active");
              const isPendingSection = group.key.startsWith("__pending_section_");
              const isRealSection = group.sectionId != null && !isPendingSection;
              const sectionIds = state
                .filter((g) => g.sectionId != null)
                .map((g) => g.sectionId as string);
              const sectionIndex = sectionIds.indexOf(group.sectionId as string);
              const isFirst = sectionIndex === 0;
              const isLast = sectionIndex === sectionIds.length - 1;
              return (
                <section key={group.key} aria-label={group.label}>
                  <header className="group flex items-center justify-between gap-3 border-b border-border py-3 first:pt-0">
                    <div className="flex min-w-0 flex-1 items-baseline gap-2">
                      <h2
                        className={cn(
                          "truncate font-semibold tracking-[-0.025em]",
                          group.sectionId != null
                            ? "text-sm text-[var(--taskspace-ink)] dark:text-foreground"
                            : "text-xs uppercase tracking-[0.07em] text-[var(--taskspace-muted)] dark:text-muted-foreground",
                        )}
                      >
                        {group.sectionId != null ? group.label : "No section"}
                      </h2>
                      <span className="shrink-0 text-xs font-bold text-[var(--taskspace-muted)] dark:text-muted-foreground">
                        {visibleTasks.length}{" "}
                        {visibleTasks.length === 1 ? "task" : "tasks"}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                      {isRealSection && canEdit ? (
                        <span className="hidden items-center gap-0.5 sm:flex sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                          <button
                            type="button"
                            aria-label={`Move ${group.label} up`}
                            disabled={isFirst || busyIds.has("__reorder__")}
                            onClick={() => moveSection(group.sectionId!, -1)}
                            className={cn(CONTROL_CLASS)}
                          >
                            <ChevronUp className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Move ${group.label} down`}
                            disabled={isLast || busyIds.has("__reorder__")}
                            onClick={() => moveSection(group.sectionId!, 1)}
                            className={cn(CONTROL_CLASS)}
                          >
                            <ChevronDown className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Rename ${group.label}`}
                            disabled={busyIds.has("__reorder__")}
                            onClick={() => {
                              setRenamingId(group.sectionId!);
                              setRenameDraft(group.label);
                            }}
                            className={cn(CONTROL_CLASS)}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${group.label}`}
                            disabled={busyIds.has("__reorder__")}
                            onClick={() => confirmDeleteSection(group.sectionId!)}
                            className={cn(CONTROL_CLASS)}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </span>
                      ) : null}

                      {canEdit && !isPendingSection ? (
                        <button
                          type="button"
                          onClick={() => {
                            setComposingKey(
                              composingKey === group.key ? null : group.key,
                            );
                            if (composingKey !== group.key) setDraft("");
                          }}
                          className="ml-1 flex items-center gap-1 rounded-[var(--taskspace-radius-input)] bg-[var(--taskspace-periwinkle-pale)] px-2 py-1 text-xs font-bold text-[var(--taskspace-cobalt)] transition-colors hover:bg-[var(--taskspace-canvas)] hover:text-[var(--taskspace-cobalt-deep)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--taskspace-coral)]"
                        >
                          <Plus className="size-3.5" />
                          Add task
                        </button>
                      ) : null}
                    </div>
                  </header>

                  {composingKey === group.key && canEdit ? (
                    <form onSubmit={submitQuickAdd} className="pb-3">
                    <div className="flex items-center gap-2 border-b border-input bg-[var(--taskspace-periwinkle-pale)]/50 px-2.5 py-2 focus-within:ring-3 focus-within:ring-[var(--taskspace-coral)]/40">
                        <Plus
                          className="size-4 shrink-0 text-[var(--taskspace-cobalt)]"
                        />
                        <input
                          autoFocus
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") setComposingKey(null);
                          }}
                          placeholder="What needs to get done?"
                          aria-label={`New task in ${group.label}`}
                          className="h-7 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                        />
                        <button
                          type="submit"
                          className="rounded-[var(--taskspace-radius-input)] bg-[var(--taskspace-cobalt)] px-2 py-1 text-xs font-bold text-white hover:bg-[var(--taskspace-cobalt-deep)]"
                        >
                          Add
                        </button>
                      </div>
                    </form>
                  ) : null}

                  {visibleTasks.length > 0 ? (
                  <div className="flex flex-col border-t border-border">
                      {visibleTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          meUserId={meUserId}
                          selected={task.id === selectedId}
                          onSelect={setSelectedId}
                          onToggleComplete={toggleComplete}
                          onDelete={canEdit ? deleteTask : undefined}
                          onMove={canEdit && showCompleted ? (taskId, direction) => moveTask({ ...group, tasks: visibleTasks }, taskId, direction) : undefined}
                          canMoveUp={visibleTasks.findIndex((item) => item.id === task.id) > 0}
                          canMoveDown={visibleTasks.findIndex((item) => item.id === task.id) < visibleTasks.length - 1}
                        />
                      ))}
                    </div>
                  ) : groupsToRender.length === 1 ? (
                    composingKey !== group.key ? (
                      <p className="px-1 py-4 text-[0.72rem] text-[var(--taskspace-muted)] dark:text-muted-foreground">
                        No open work in this section.
                      </p>
                    ) : null
                  ) : null}
                </section>
              );
            })}
          </div>
        )}

        {state.some((group) => group.tasks.some((task) => task.status === "completed")) ? <button type="button" onClick={() => setShowCompleted((value) => !value)} className="mt-5 inline-flex rounded-[var(--taskspace-radius-input)] bg-[var(--taskspace-periwinkle-pale)] px-2.5 py-1.5 text-xs font-bold text-[var(--taskspace-cobalt)] transition-colors hover:bg-[var(--taskspace-canvas)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)]">{showCompleted ? "Hide completed tasks" : "Show completed tasks"}</button> : null}

        {canEdit ? (
          <div className={cn("mt-5", isEmpty && "mt-5")}>
            {creatingSection ? (
              <form
                onSubmit={submitCreateSection}
                className="flex w-full items-center gap-2 border-y border-border bg-[var(--taskspace-periwinkle-pale)]/50 px-2.5 py-1.5 focus-within:ring-3 focus-within:ring-[var(--taskspace-coral)]/40 dark:bg-[var(--taskspace-periwinkle-pale)]/10"
              >
                <Plus
                  className="size-4 shrink-0 text-[var(--taskspace-cobalt)]"
                />
                <label
                  htmlFor="new-section-name"
                  className="shrink-0 text-xs font-bold text-[var(--taskspace-muted)]"
                >
                  New section
                </label>
                <input
                  id="new-section-name"
                  autoFocus
                  value={sectionDraft}
                  onChange={(event) => setSectionDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setCreatingSection(false);
                      setSectionDraft("");
                    }
                  }}
                  placeholder="Section name"
                  aria-label="New section name"
                  className="h-7 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  className="rounded-[var(--taskspace-radius-input)] px-2 py-0.5 text-xs font-bold text-[var(--taskspace-cobalt)] hover:bg-muted"
                >
                  Create
                </button>
                <button
                  type="button"
                  aria-label="Cancel new section"
                  onClick={() => {
                    setCreatingSection(false);
                    setSectionDraft("");
                  }}
                  className={cn(CONTROL_CLASS, "size-6")}
                >
                  <X className="size-4" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                disabled={busyIds.has("__reorder__")}
                onClick={() => setCreatingSection(true)}
                className="flex items-center gap-1.5 rounded-[var(--taskspace-radius-input)] bg-[var(--taskspace-periwinkle-pale)] px-2.5 py-1.5 text-[0.72rem] font-bold text-[var(--taskspace-cobalt)] transition-colors hover:bg-[var(--taskspace-canvas)] hover:text-[var(--taskspace-cobalt-deep)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--taskspace-coral)] focus-visible:ring-offset-2"
              >
                <Plus className="size-3.5" />
                New section
              </button>
            )}
          </div>
        ) : null}
        </div>
      </div>

      <Dialog
        open={sectionPendingRename !== null}
        onOpenChange={(open) => {
          if (!open) setRenamingId(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <form onSubmit={submitRename} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Rename section</DialogTitle>
              <DialogDescription>
                Give this group of work a clear, scannable name.
              </DialogDescription>
            </DialogHeader>
            <label className="grid gap-1.5 text-xs font-bold text-[var(--taskspace-muted)]" htmlFor="section-name">
              Section name
              <input
                id="section-name"
                autoFocus
                value={renameDraft}
                onChange={(event) => setRenameDraft(event.target.value)}
                placeholder="Section name"
                className="h-[34px] rounded-[var(--taskspace-radius-input)] border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)]"
              />
            </label>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setRenamingId(null)}
                className="h-[34px] rounded-[var(--taskspace-radius-input)] border border-border bg-background px-3 text-xs font-bold text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!sectionPendingRename || busyIds.has(`__rename_${renamingId}`)}
                className="h-[34px] rounded-[var(--taskspace-radius-input)] bg-primary px-3 text-xs font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)]"
              >
                Save name
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={sectionPendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {sectionPendingDeletion?.label ?? "this section"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Its tasks will move to the project&apos;s &ldquo;No section&rdquo;
              bucket. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmingDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={
                !sectionPendingDeletion ||
                busyIds.has(`__delete_${sectionPendingDeletion?.sectionId}`)
              }
              onClick={() => {
                if (!sectionPendingDeletion) return;
                deleteSection(sectionPendingDeletion);
              }}
              className="bg-[var(--taskspace-coral)] text-white hover:bg-[var(--taskspace-coral)]/90 focus-visible:ring-[var(--taskspace-coral)]"
            >
              Delete section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isMobile ? <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelectedId(null); }}><SheetContent side="bottom" className="max-h-[78vh] overflow-y-auto rounded-t-[17px] border-border bg-[var(--taskspace-periwinkle-pale)] p-0 shadow-[var(--taskspace-mobile-sheet)]" aria-label="Task detail">{selected ? <TaskDetailRecord
            key={selected.task.id}
            task={selected.task}
            projectName={projectName}
            projectId={projectId}
            sectionName={selected.sectionName}
            meUserId={meUserId}
            onDelete={canEdit ? deleteTask : undefined}
            canEdit={canEdit}
            availableLabels={labels}
            members={members}
            canModerateComments={canModerateComments}
          /> : null}</SheetContent></Sheet> : selected ? <div className="taskspace-record min-w-0">
        <TaskDetailRecord key={selected.task.id} task={selected.task} projectName={projectName} projectId={projectId} sectionName={selected.sectionName} meUserId={meUserId} onDelete={canEdit ? deleteTask : undefined} canEdit={canEdit} availableLabels={labels} members={members} canModerateComments={canModerateComments} />
      </div> : null}
    </div>
  );
}
