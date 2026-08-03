"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ListChecks, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  completeTaskAction,
  createTaskAction,
  reopenTaskAction,
} from "@/lib/server-actions/tasks";
import { cn } from "@/lib/utils";
import { TaskDetailRecord } from "./task-detail-record";
import { TaskRow } from "./task-row";
import type { TaskGroup, TaskRowData } from "./types";

/**
 * Task 0301 — the sectioned task list + coexisting detail record (Taskspace).
 *
 * Drives the paper task list from server-fetched `groups`:
 * - selecting a row shows its record in the right-hand panel without navigating
 *   away (DESIGN.md coexistence rule / wire-up to Task 0305),
 * - the completion control calls the DAO-backed actions with an optimistic
 *   update (never colour-only),
 * - each section carries the small citron "+ Add task" quick-add affordance
 *   (Task 0301 step 6).
 *
 * Mutations stay optimistic and reconcile via `router.refresh()` so the server
 * remains the source of truth.
 */
export function Taskspace({
  projectId,
  projectName,
  meUserId,
  canEdit,
  groups,
}: {
  projectId: string;
  projectName: string;
  meUserId: string | null;
  canEdit: boolean;
  groups: TaskGroup[];
}) {
  const router = useRouter();
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

  const isEmpty = state.every((group) => group.tasks.length === 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        {isEmpty ? (
          <div className="flex flex-col items-start gap-3 border-y border-dashed border-border py-10">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ListChecks className="size-5" />
            </span>
            <h2 className="text-base font-semibold text-foreground">
              Nothing here yet
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Add a task with the &ldquo;+ Add task&rdquo; control, or pick
              another project.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {state.map((group) => (
              <section key={group.key} aria-label={group.label}>
                <header className="flex items-center justify-between gap-4 py-2.5">
                  <h2 className="flex items-center gap-2 text-[0.62rem] font-[760] uppercase tracking-[0.08em] text-muted-foreground">
                    {group.label}
                    {group.tasks.length > 0 ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[0.6rem] font-semibold">
                        {group.tasks.length}
                      </span>
                    ) : null}
                  </h2>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setComposingKey(
                          composingKey === group.key ? null : group.key,
                        );
                        if (composingKey !== group.key) setDraft("");
                      }}
                      className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[0.68rem] font-[760] text-[#5963ae] transition-colors hover:bg-muted hover:text-[#252d95] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#ff765d] focus-visible:ring-offset-2"
                    >
                      <Plus className="size-3.5" />
                      Add task
                    </button>
                  )}
                </header>

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
                        className="rounded-md px-2 py-0.5 text-[0.68rem] font-bold text-[#5963ae] hover:bg-muted"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                ) : null}

                {group.tasks.length > 0 ? (
                  <div className="flex flex-col border-t border-[#ebedf4]">
                    {group.tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        meUserId={meUserId}
                        selected={task.id === selectedId}
                        onSelect={setSelectedId}
                        onToggleComplete={toggleComplete}
                      />
                    ))}
                  </div>
                ) : (
                  composingKey !== group.key && (
                    <p className="py-4 text-sm text-muted-foreground">
                      No tasks in this section.
                    </p>
                  )
                )}
              </section>
            ))}
          </div>
        )}
      </div>

      <div className={cn("min-w-0", !selected && "lg:hidden")}>
        {selected ? (
          <TaskDetailRecord
            task={selected.task}
            projectName={projectName}
            sectionName={selected.sectionName}
            meUserId={meUserId}
          />
        ) : null}
      </div>
    </div>
  );
}
