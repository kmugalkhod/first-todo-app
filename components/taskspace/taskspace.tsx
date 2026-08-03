"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Check,
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
  const isMobile = useIsMobile();
  const [state, setState] = React.useState(groups);
  const [selectedId, setSelectedId] = React.useState<string | null>(() => {
    for (const group of groups) {
      const active = group.tasks.find((task) => task.status === "active");
      if (active) return active.id;
    }
    return groups[0]?.tasks[0]?.id ?? null;
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
    if (task) {
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

    setComposingKey(null);
    setDraft("");
    withBusy("__create__", async () => {
      const res = await createTaskAction(projectId, {
        title,
        sectionId: group.sectionId,
      });
      if (!res.ok) {
        toast.error(res.error.message ?? "Couldn't add the task.");
        return;
      }
      setSelectedId(res.data.id);
      toast.success("Task added");
      router.refresh();
    });
  }

  function submitCreateSection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = sectionDraft.trim();
    if (!name) return;
    setSectionDraft("");
    runSectionAction("__new_section__", () =>
      createSectionAction(projectId, { name }),
    );
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
    if (confirmingDelete === sectionId) {
      runSectionAction(`__delete_${sectionId}`, () =>
        removeSectionAction(sectionId),
      );
    } else {
      setConfirmingDelete(sectionId);
    }
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
  const hasTasks = state.some((group) => group.tasks.some((task) => task.status === "active"));
  const isEmpty = !hasSections && !hasTasks;

  return (
    <div className="grid min-h-[calc(100svh-13rem)] gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(330px,.62fr)]">
      <div className="min-w-0">
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
        ) : (
          <div className="flex flex-col">
            {state.map((group) => {
              const visibleTasks = showCompleted
                ? group.tasks
                : group.tasks.filter((task) => task.status === "active");
              const isRealSection = group.sectionId != null;
              const sectionIds = state
                .filter((g) => g.sectionId != null)
                .map((g) => g.sectionId as string);
              const sectionIndex = sectionIds.indexOf(group.sectionId as string);
              const isFirst = sectionIndex === 0;
              const isLast = sectionIndex === sectionIds.length - 1;
              const renamingThis = renamingId === group.sectionId;
              const deletingThis = confirmingDelete === group.sectionId;

              return (
                <section key={group.key} aria-label={group.label}>
                  <header className="flex items-center justify-between gap-3 border-b border-[#dfe2ef] py-2.5 dark:border-[#2a2f4a]">
                    <div className="flex min-w-0 items-baseline gap-2">
                      {renamingThis ? (
                        <form
                          onSubmit={submitRename}
                          className="flex w-full items-center gap-2"
                        >
                          <input
                            autoFocus
                            value={renameDraft}
                            onChange={(event) => setRenameDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                setRenamingId(null);
                              }
                            }}
                            aria-label="Rename section"
                            className="h-7 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#ff765d]"
                          />
                          <button
                            type="submit"
                            aria-label="Save section name"
                            className={cn(CONTROL_CLASS)}
                          >
                            <Check className="size-4" />
                          </button>
                          <NoiseButton
                            aria-label="Cancel rename"
                            onClick={() => setRenamingId(null)}
                          >
                            <X className="size-4" />
                          </NoiseButton>
                        </form>
                      ) : (
                        <>
                          <h2
                            className={cn(
                              "truncate font-semibold tracking-[-0.025em]",
                              group.sectionId != null
                                ? "text-sm text-[#202550] dark:text-foreground"
                                : "text-xs uppercase tracking-[0.07em] text-[#8790ac] dark:text-muted-foreground",
                            )}
                          >
                            {group.sectionId != null
                              ? group.label
                              : "No section"}
                          </h2>
                          <span className="shrink-0 text-xs font-bold text-[#8790ac] dark:text-muted-foreground">
                            {visibleTasks.length}{" "}
                            {visibleTasks.length === 1 ? "task" : "tasks"}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                      {isRealSection && canEdit && !renamingThis ? (
                        <>
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
                            className={cn(
                              CONTROL_CLASS,
                              deletingThis &&
                                "text-[#ff765d] hover:bg-[#ff765d]/10 hover:text-[#ff765d]",
                            )}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </>
                      ) : null}

                      {canEdit && !renamingThis ? (
                        <button
                          type="button"
                          onClick={() => {
                            setComposingKey(
                              composingKey === group.key ? null : group.key,
                            );
                            if (composingKey !== group.key) setDraft("");
                          }}
                          className="ml-1 flex items-center gap-1 rounded-md border-0 bg-transparent p-1 text-xs font-bold text-[#5965bd] transition-colors hover:text-[#252d95] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#ff765d] dark:text-[#8b93d6] dark:hover:text-[#c3c9ff]"
                        >
                          <Plus className="size-3.5" />
                          Add task
                        </button>
                      ) : null}
                    </div>
                  </header>

                  {deletingThis ? (
                    <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-[#ff765d]/40 bg-[#ff765d]/5 px-3 py-2">
                      <p className="text-xs leading-5 text-muted-foreground">
                        Its tasks will move to the project&apos;s &ldquo;No
                        section&rdquo; bucket.
                      </p>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => confirmDeleteSection(group.sectionId!)}
                          disabled={busyIds.has(`__delete_${group.sectionId}`)}
                          className="rounded-md bg-[#ff765d] px-2 py-1 text-xs font-bold text-white hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff765d] focus-visible:ring-offset-1"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(null)}
                          className="rounded-md px-2 py-1 text-xs font-bold text-muted-foreground hover:bg-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {composingKey === group.key && canEdit ? (
                    <form onSubmit={submitQuickAdd} className="pb-3">
                      <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-1.5 focus-within:ring-3 focus-within:ring-[#ff765d]/40">
                        <Plus
                          className="size-4 shrink-0 text-[#edff81] mix-blend-multiply dark:mix-blend-screen"
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
                          className="rounded-md px-2 py-0.5 text-xs font-bold text-[#5963ae] hover:bg-muted"
                        >
                          Add
                        </button>
                      </div>
                    </form>
                  ) : null}

                  {visibleTasks.length > 0 ? (
                    <div className="flex flex-col border-t border-[#ebedf4]">
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
                  ) : (
                    composingKey !== group.key &&
                    !deletingThis && (
                      <p className="px-1 py-4 text-[0.72rem] text-[#8189a4] dark:text-muted-foreground">
                        No open work in this section.
                      </p>
                    )
                  )}
                </section>
              );
            })}
          </div>
        )}

        {state.some((group) => group.tasks.some((task) => task.status === "completed")) ? <button type="button" onClick={() => setShowCompleted((value) => !value)} className="mt-6 rounded-md px-1 py-1 text-xs font-bold text-[#5963ae] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff765d]">{showCompleted ? "Hide completed tasks" : "Show completed tasks"}</button> : null}

        {canEdit ? (
          <div className={cn("mt-7", isEmpty && "mt-5")}>
            {creatingSection ? (
              <form
                onSubmit={submitCreateSection}
                className="flex w-full items-center gap-2 rounded-lg border border-[#d7dcf1] bg-[#eef0ff]/50 px-2.5 py-1.5 focus-within:ring-3 focus-within:ring-[#ff765d]/40 dark:bg-[#eef0ff]/10"
              >
                <Plus
                  className="size-4 shrink-0 text-[#5963ae] dark:text-[#8b93d6]"
                />
                <input
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
                  className="rounded-md px-2 py-0.5 text-xs font-bold text-[#5963ae] hover:bg-[#dfe3ff] dark:hover:bg-[#ffffff12]"
                >
                  Add section
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
                className="flex items-center gap-1.5 rounded-md border-0 bg-transparent p-0 text-[0.72rem] font-bold text-[#5965bd] transition-colors hover:text-[#252d95] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#ff765d] focus-visible:ring-offset-2 dark:text-[#8b93d6] dark:hover:text-[#c3c9ff]"
              >
                <Plus className="size-3.5" />
                New section
              </button>
            )}
          </div>
        ) : null}
      </div>

      {isMobile ? <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelectedId(null); }}><SheetContent side="bottom" className="max-h-[78vh] overflow-y-auto rounded-t-[17px] border-border bg-[var(--taskspace-periwinkle-pale)] p-0 shadow-[var(--taskspace-mobile-sheet)]" aria-label="Task detail">{selected ? <TaskDetailRecord
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
          /> : null}</SheetContent></Sheet> : <div className={cn("min-w-0", !selected && "lg:hidden")}>
        {selected ? <TaskDetailRecord task={selected.task} projectName={projectName} projectId={projectId} sectionName={selected.sectionName} meUserId={meUserId} onDelete={canEdit ? deleteTask : undefined} canEdit={canEdit} availableLabels={labels} members={members} canModerateComments={canModerateComments} /> : null}
      </div>}
    </div>
  );
}

/** Tiny icon button using the shared control styling. */
function NoiseButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={cn(CONTROL_CLASS, className)} {...props} />;
}
