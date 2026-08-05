"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  ListChecks,
  MoreHorizontal,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useTaskCapture } from "./task-capture-context";
import { TaskRow } from "./task-row";
import { resolveTaskSelection, topLevelTaskId } from "./task-selection";
import type { TaskGroup, TaskRowData } from "./types";
import type { ActionResult } from "@/lib/server-actions/types";
import type { ProjectDTO } from "@/lib/data-access";

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
 * Mutations stay optimistic where shown and reconcile with the fresh RSC
 * payload streamed in the Server Action response.
 */

/** Small focus/ring style shared by the section + quick-add controls. */
const CONTROL_CLASS =
  "flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)] focus-visible:ring-offset-1 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground";

export function Taskspace({
  projectId,
  projectName,
  project,
  meUserId,
  canEdit,
  groups,
  taskRecords,
  labels = [],
  members = [],
  latestActivity = null,
  canModerateComments = false,
}: {
  projectId: string;
  projectName: string;
  project: ProjectDTO;
  meUserId: string | null;
  canEdit: boolean;
  groups: TaskGroup[];
  /** All project tasks, including nested children omitted from list groups. */
  taskRecords: TaskRowData[];
  labels?: Array<{ id: string; name: string }>;
  members?: Array<{
    id: string;
    name: string;
    role: "owner" | "editor" | "viewer";
  }>;
  latestActivity?: {
    actor: string;
    action: string;
    createdAt: string;
  } | null;
  canModerateComments?: boolean;
}) {
  const { registerTaskCapture } = useTaskCapture();
  // The task record remains next to its list through tablet widths. It only
  // becomes a sheet at the design system's dedicated 620px sheet breakpoint.
  const isMobile = useIsMobile(620);
  const [state, setState] = React.useState(groups);
  const [recordState, setRecordState] = React.useState(taskRecords);
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
  const [switchingToProject, setSwitchingToProject] = React.useState<string | null>(null);

  // Section management (Task 0302) state.
  const [creatingSection, setCreatingSection] = React.useState(false);
  const [sectionDraft, setSectionDraft] = React.useState("");
  const sectionNameInputRef = React.useRef<HTMLInputElement>(null);
  const taskComposerInputRef = React.useRef<HTMLInputElement>(null);
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
      const unsectionedGroup: TaskGroup = {
        key: "unsectioned",
        sectionId: null,
        label: projectName,
        tasks: [],
      };
      setState([unsectionedGroup]);
      setComposingKey(unsectionedGroup.key);
      setDraft("");
      return;
    }
    setComposingKey(firstGroup.key);
    setDraft("");
  }, [projectName, state]);

  React.useEffect(() => {
    return registerTaskCapture(openQuickAdd);
  }, [openQuickAdd, registerTaskCapture]);

  React.useEffect(() => {
    function closeSelectedRecord(event: KeyboardEvent) {
      if (event.key !== "Escape" || !selectedId) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.matches("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      setSelectedId(null);
    }
    window.addEventListener("keydown", closeSelectedRecord);
    return () => window.removeEventListener("keydown", closeSelectedRecord);
  }, [selectedId]);

  React.useEffect(() => {
    if (!composingKey) return;
    const frame = window.requestAnimationFrame(() => {
      const input = taskComposerInputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      input.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [composingKey]);

  React.useEffect(() => {
    const startProjectSwitch = (event: Event) => {
      setSwitchingToProject((event as CustomEvent<string>).detail);
    };
    window.addEventListener("taskspace:project-switch", startProjectSwitch);
    return () =>
      window.removeEventListener("taskspace:project-switch", startProjectSwitch);
  }, []);

  // The section composer is conditionally mounted. Focus it after that commit
  // so activating "New section" always produces an immediately usable field.
  React.useEffect(() => {
    if (!creatingSection) return;
    const frame = window.requestAnimationFrame(() => {
      sectionNameInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [creatingSection]);

  // Re-sync whenever a Server Action streams a fresh server snapshot, without
  // resetting the selection.
  // Kept as render-time state adjustment (the React-recommended pattern) so the
  // React Compiler preserves optimisation.
  const [prevGroups, setPrevGroups] = React.useState(groups);
  if (prevGroups !== groups) {
    setPrevGroups(groups);
    setState(groups);
  }
  const [prevTaskRecords, setPrevTaskRecords] = React.useState(taskRecords);
  if (prevTaskRecords !== taskRecords) {
    setPrevTaskRecords(taskRecords);
    // Keep locally selectable records alive across the same-roundtrip RSC
    // refresh until their action result replaces the temporary id.
    const pendingRecords = recordState.filter(
      (record) =>
        record.id.startsWith("__pending_") &&
        !taskRecords.some((serverRecord) => serverRecord.id === record.id),
    );
    setRecordState([...taskRecords, ...pendingRecords]);
  }

  if (switchingToProject) {
    return (
      <div className="taskspace-workboard min-h-[calc(100svh-var(--taskspace-topbar-height))]" aria-busy="true" aria-live="polite">
        <span className="sr-only">Opening {switchingToProject}</span>
        <div className="px-4 pb-12 pt-6 sm:px-9">
          <div className="h-10 w-64 max-w-full animate-pulse rounded-[var(--taskspace-radius-control)] bg-[var(--taskspace-periwinkle-pale)]" />
          <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded-[var(--taskspace-radius-chip)] bg-[var(--taskspace-periwinkle-pale)]" />
          <div className="mt-[var(--taskspace-space-content)] space-y-2 border-t border-border pt-[var(--taskspace-space-compact)]">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-[66px] animate-pulse rounded-[var(--taskspace-radius-panel)] bg-[var(--taskspace-periwinkle-pale)]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const selected = resolveTaskSelection(
    state,
    recordState,
    selectedId,
  );
  const selectedListTaskId = topLevelTaskId(recordState, selectedId);

  function selectTaskRecord(task: TaskRowData) {
    setRecordState((current) =>
      current.some((record) => record.id === task.id)
        ? current
        : [...current, task],
    );
    setSelectedId(task.id);
  }

  function updateVisibleTask(taskId: string, patch: Partial<TaskRowData>) {
    setState((current) =>
      current.map((group) => ({
        ...group,
        tasks: group.tasks.map((task) =>
          task.id === taskId ? { ...task, ...patch } : task,
        ),
      })),
    );
    setRecordState((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, ...patch } : task,
      ),
    );
  }

  function resolveOptimisticTask(
    pendingId: string,
    task: TaskRowData | null,
    parentTaskId: string,
  ) {
    setRecordState((current) => {
      const withoutPending = current.filter((record) => record.id !== pendingId);
      if (!task || withoutPending.some((record) => record.id === task.id)) {
        return withoutPending;
      }
      return [...withoutPending, task];
    });
    setSelectedId((current) =>
      current === pendingId ? (task?.id ?? parentTaskId) : current,
    );
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

  /** Pump a section mutation through the busy guard. */
  function runSectionAction(
    busyKey: string,
    fn: () => Promise<ActionResult<unknown>>,
    onSuccess?: () => void,
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
      onSuccess?.();
    });
  }

  async function toggleComplete(taskId: string, complete: boolean) {
    if (busyIds.has(taskId)) return;
    const previous = state;
    const previousRecords = recordState;
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
    setRecordState((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, status: complete ? "completed" : "active" }
          : task,
      ),
    );
    withBusy(taskId, async () => {
      const res = complete
        ? await completeTaskAction(taskId)
        : await reopenTaskAction(taskId);
      if (!res.ok) {
        setState(previous);
        setRecordState(previousRecords);
        toast.error(res.error.message ?? "Couldn't update the task.");
        return;
      }
    });
  }

  /** Delete a task, removing it optimistically from the snapshot. */
  async function deleteTask(taskId: string) {
    if (busyIds.has(taskId)) return;
    const previous = state;
    const previousSelectedId = selectedId;
    const remaining = state.map((group) => ({
      ...group,
      tasks: group.tasks.filter((task) => task.id !== taskId),
    }));
    const orderedBeforeDelete = state.flatMap((group) => group.tasks);
    const deletedIndex = orderedBeforeDelete.findIndex(
      (task) => task.id === taskId,
    );
    const nextSelection =
      orderedBeforeDelete[deletedIndex + 1]?.id ??
      orderedBeforeDelete[deletedIndex - 1]?.id ??
      null;
    setState(remaining);
    const previousRecords = recordState;
    setRecordState((current) =>
      current.filter((task) => task.id !== taskId),
    );
    if (selectedId === taskId) setSelectedId(nextSelection);
    withBusy(taskId, async () => {
      const res = await deleteTaskAction(taskId);
      if (!res.ok) {
        setState(previous);
        setRecordState(previousRecords);
        setSelectedId(previousSelectedId);
        toast.error(res.error.message ?? "Couldn't delete the task.");
        return;
      }
      toast.success("Task deleted");
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
    setRecordState((current) => [...current, pendingTask]);
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
        setRecordState((current) =>
          current.filter((task) => task.id !== pendingId),
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
          tasks: item.tasks.some((itemTask) => itemTask.id === task.id)
            ? item.tasks.filter((itemTask) => itemTask.id !== pendingId)
            : item.tasks.map((itemTask) =>
                itemTask.id === pendingId ? task : itemTask,
              ),
        })),
      );
      setRecordState((current) =>
        current.some((record) => record.id === task.id)
          ? current.filter((record) => record.id !== pendingId)
          : current.map((record) =>
              record.id === pendingId ? task : record,
            ),
      );
      setSelectedId(res.data.id);
      toast.success("Task added");
    });
  }

  function submitCreateSection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyIds.has("__new_section__")) return;
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
    });
  }

  function startCreatingSection() {
    if (busyIds.has("__new_section__")) return;
    setSectionDraft("");
    setCreatingSection(true);
  }

  function submitRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = renameDraft.trim();
    if (!name || !renamingId) return;
    runSectionAction(`__rename_${renamingId}`, () =>
      renameSectionAction(renamingId, name),
      () =>
        setState((current) =>
          current.map((group) =>
            group.sectionId === renamingId ? { ...group, label: name } : group,
          ),
        ),
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
    const previous = state;
    const rank = new Map(next.map((id, position) => [id, position]));
    setState((current) =>
      [...current].sort((a, b) => {
        if (!a.sectionId) return 1;
        if (!b.sectionId) return -1;
        return (rank.get(a.sectionId) ?? 0) - (rank.get(b.sectionId) ?? 0);
      }),
    );
    runSectionAction("__reorder__", async () => {
      const result = await reorderSectionsAction(projectId, next);
      if (!result.ok) setState(previous);
      return result;
    });
  }

  /** Manual ordering stays in the selected record, keeping the scan-line pure. */
  function moveTask(group: TaskGroup, taskId: string, direction: "up" | "down") {
    if (!group.sectionId && group.key !== "unsectioned") return;
    const index = group.tasks.findIndex((task) => task.id === taskId);
    const target = index + (direction === "up" ? -1 : 1);
    if (index < 0 || target < 0 || target >= group.tasks.length) return;
    const ordered = group.tasks.map((task) => task.id);
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const previous = state;
    setState((current) =>
      current.map((currentGroup) =>
        currentGroup.key === group.key
          ? {
              ...currentGroup,
              tasks: ordered
                .map((id) => currentGroup.tasks.find((task) => task.id === id))
                .filter((task): task is TaskRowData => task != null),
            }
          : currentGroup,
      ),
    );
    withBusy(`__task_order_${group.key}`, async () => {
      const result = await reorderTasksAction(projectId, group.sectionId, ordered);
      if (!result.ok) {
        setState(previous);
        toast.error(result.error.message ?? "Couldn't reorder the tasks.");
      }
    });
  }

  // A section is useful context even when all of its tasks are completed and
  // temporarily hidden. Only a project with no groups at all is truly empty.
  const isEmpty = state.length === 0;
  const groupsToRender = state;
  const completedCount = state.reduce(
    (total, group) =>
      total + group.tasks.filter((task) => task.status === "completed").length,
    0,
  );
  const sectionPendingDeletion = confirmingDelete
    ? state.find((group) => group.sectionId === confirmingDelete) ?? null
    : null;
  const sectionPendingRename = renamingId
    ? state.find((group) => group.sectionId === renamingId) ?? null
    : null;

  return (
    <div
      className={cn(
        "taskspace-workboard min-h-[calc(100svh-var(--taskspace-topbar-height))]",
        selected && "taskspace-workboard--with-detail",
      )}
    >
      <div className="min-w-0">
        <ProjectHeader userId={meUserId ?? ""} project={project} members={members} latestActivity={latestActivity} />
        <div className="px-4 pb-12 pt-6 sm:px-9">
        {isEmpty ? (
          <div className="flex min-h-52 flex-col items-start justify-center border-y border-border py-8">
            <span className="mb-4 flex size-9 items-center justify-center rounded-[var(--taskspace-radius-control)] border border-border bg-muted text-muted-foreground">
              <ListChecks aria-hidden="true" className="size-4" />
            </span>
            <h2 className="text-[length:var(--taskspace-font-size-section)] font-bold leading-tight tracking-[-0.025em] text-foreground">
              Capture the first task
            </h2>
            <p className="mt-1.5 max-w-sm text-[length:var(--taskspace-font-size-body)] leading-6 text-muted-foreground">
              Add the next commitment now. You can organise it into sections
              when the shape of the work becomes clearer.
            </p>
            {canEdit ? (
              <button
                type="button"
                onClick={openQuickAdd}
                className="mt-5 inline-flex h-[35px] items-center gap-1.5 rounded-[var(--taskspace-radius-control)] bg-[var(--taskspace-cobalt)] px-3 text-xs font-extrabold text-white transition-[background-color,transform] duration-150 hover:bg-[var(--taskspace-cobalt-deep)] active:translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)] focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                <Plus aria-hidden="true" className="size-4" />
                Add first task
              </button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col">
            {groupsToRender.map((group, groupIndex) => {
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
                <section
                  key={group.key}
                  aria-label={group.label}
                  className={cn(groupIndex > 0 && "mt-[var(--taskspace-space-section)]")}
                >
                  <header className="group flex items-center justify-between gap-3 border-b border-border pb-[var(--taskspace-space-control)]">
                    <div className="flex min-w-0 flex-1 items-baseline gap-2">
                    <h2
                        className={cn(
                          "truncate font-bold leading-[1.2] tracking-[-0.025em]",
                          group.sectionId != null
                            ? "text-[length:var(--taskspace-font-size-section)] text-[var(--taskspace-ink)] dark:text-foreground"
                            : "text-xs uppercase tracking-[0.07em] text-[var(--taskspace-muted)] dark:text-muted-foreground",
                        )}
                      >
                        {group.sectionId != null ? group.label : "No section"}
                      </h2>
                      <span className="shrink-0 text-[length:var(--taskspace-font-size-micro)] font-extrabold uppercase tracking-[var(--taskspace-tracking-label)] text-[var(--taskspace-muted)] dark:text-muted-foreground">
                        {visibleTasks.length}{" "}
                        {visibleTasks.length === 1 ? "task" : "tasks"}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                      {isRealSection && canEdit ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<button type="button" />}
                            aria-label={`Manage ${group.label}`}
                            className={CONTROL_CLASS}
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              disabled={isFirst || busyIds.has("__reorder__")}
                              onClick={() => moveSection(group.sectionId!, -1)}
                            >
                              <ChevronUp className="size-4" />
                              Move section up
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={isLast || busyIds.has("__reorder__")}
                              onClick={() => moveSection(group.sectionId!, 1)}
                            >
                              <ChevronDown className="size-4" />
                              Move section down
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setRenamingId(group.sectionId!);
                                setRenameDraft(group.label);
                              }}
                            >
                              <Pencil className="size-4" />
                              Rename section
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() =>
                                confirmDeleteSection(group.sectionId!)
                              }
                            >
                              <Trash2 className="size-4" />
                              Delete section
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                          className="ml-1 flex items-center gap-1 rounded-[var(--taskspace-radius-input)] px-1.5 py-1 text-[length:var(--taskspace-font-size-meta)] font-extrabold text-[var(--taskspace-cobalt)] transition-[color,transform] duration-150 hover:text-[var(--taskspace-cobalt-deep)] active:translate-y-px focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--taskspace-coral)] motion-reduce:transition-none"
                        >
                          + Add task
                        </button>
                      ) : null}
                    </div>
                  </header>

                  {composingKey === group.key && canEdit ? (
                    <form onSubmit={submitQuickAdd} className="pt-[var(--taskspace-space-tight)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-150">
                    <div className="flex items-center gap-2 rounded-[var(--taskspace-radius-panel)] border border-input bg-[var(--taskspace-periwinkle-pale)] px-2.5 py-2 transition-colors focus-within:border-[var(--taskspace-cobalt)] focus-within:ring-3 focus-within:ring-[var(--taskspace-coral)]/35">
                        <Plus
                          className="size-4 shrink-0 text-[var(--taskspace-cobalt)]"
                        />
                        <input
                          ref={taskComposerInputRef}
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
                  <div className="flex flex-col">
                      {visibleTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          meUserId={meUserId}
                          selected={task.id === selectedListTaskId}
                          onSelect={setSelectedId}
                          onToggleComplete={toggleComplete}
                        />
                      ))}
                    </div>
                  ) : groupsToRender.length === 1 ? (
                    composingKey !== group.key ? (
                      <p className="px-1 py-4 text-[length:var(--taskspace-font-size-body)] text-[var(--taskspace-muted)] dark:text-muted-foreground">
                        No open work in this section.
                      </p>
                    ) : null
                  ) : null}
                </section>
              );
            })}
          </div>
        )}

        {completedCount > 0 ? <button type="button" onClick={() => setShowCompleted((value) => !value)} className="mt-5 inline-flex rounded-[var(--taskspace-radius-input)] px-1 py-1 text-[length:var(--taskspace-font-size-meta)] font-extrabold text-[var(--taskspace-cobalt)] transition-[color,transform] duration-150 hover:text-[var(--taskspace-cobalt-deep)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)] motion-reduce:transition-none">{showCompleted ? `Hide ${completedCount} completed` : `Show ${completedCount} completed`}</button> : null}

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
                  ref={sectionNameInputRef}
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
                  disabled={busyIds.has("__new_section__")}
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
                disabled={busyIds.has("__new_section__")}
                onClick={startCreatingSection}
                className="flex items-center gap-1.5 rounded-[var(--taskspace-radius-input)] px-1 py-1 text-[length:var(--taskspace-font-size-meta)] font-extrabold text-[var(--taskspace-cobalt)] transition-[color,transform] duration-150 hover:text-[var(--taskspace-cobalt-deep)] active:translate-y-px focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--taskspace-coral)] focus-visible:ring-offset-2 motion-reduce:transition-none"
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

      {isMobile ? <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelectedId(null); }}><SheetContent side="bottom" showCloseButton={false} className="max-h-[78vh] overflow-y-auto rounded-t-[var(--taskspace-radius-mobile-sheet)] border-border bg-[var(--taskspace-periwinkle-pale)] p-0 shadow-[var(--taskspace-mobile-sheet)]" aria-label="Task detail">{selected ? <TaskDetailRecord
            key={selected.task.id}
            task={selected.task}
            projectName={projectName}
            projectId={projectId}
            sectionName={selected.sectionName}
            meUserId={meUserId}
            onClose={() => setSelectedId(null)}
            onDelete={canEdit ? deleteTask : undefined}
            canEdit={canEdit}
            availableLabels={labels}
            members={members}
            canModerateComments={canModerateComments}
            onSelectTask={selectTaskRecord}
            onResolveOptimisticTask={resolveOptimisticTask}
            onTaskChange={updateVisibleTask}
            onToggleComplete={toggleComplete}
            onMove={canEdit && showCompleted && selected.group && selected.task.parentTaskId == null ? (direction) => moveTask(selected.group!, selected.task.id, direction) : undefined}
            canMoveUp={selected.group ? selected.group.tasks.findIndex((task) => task.id === selected.task.id) > 0 : false}
            canMoveDown={selected.group ? selected.group.tasks.findIndex((task) => task.id === selected.task.id) < selected.group.tasks.length - 1 : false}
          /> : null}</SheetContent></Sheet> : selected ? <div className="taskspace-record min-w-0">
        <TaskDetailRecord key={selected.task.id} task={selected.task} projectName={projectName} projectId={projectId} sectionName={selected.sectionName} meUserId={meUserId} onClose={() => setSelectedId(null)} onDelete={canEdit ? deleteTask : undefined} canEdit={canEdit} availableLabels={labels} members={members} canModerateComments={canModerateComments} onSelectTask={selectTaskRecord} onResolveOptimisticTask={resolveOptimisticTask} onTaskChange={updateVisibleTask} onToggleComplete={toggleComplete} onMove={canEdit && showCompleted && selected.group && selected.task.parentTaskId == null ? (direction) => moveTask(selected.group!, selected.task.id, direction) : undefined} canMoveUp={selected.group ? selected.group.tasks.findIndex((task) => task.id === selected.task.id) > 0 : false} canMoveDown={selected.group ? selected.group.tasks.findIndex((task) => task.id === selected.task.id) < selected.group.tasks.length - 1 : false} />
      </div> : null}
    </div>
  );
}
