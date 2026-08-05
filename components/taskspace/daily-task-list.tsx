"use client";

import * as React from "react";
import { ArrowRight, CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  completeTaskAction,
  createInboxTaskAction,
  moveTaskToProjectAction,
  reopenTaskAction,
} from "@/lib/server-actions/tasks";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageContainer,
  PageHeader,
} from "@/components/ui/page-shell";
import { useTaskCapture } from "./task-capture-context";
import { TaskRow } from "./task-row";
import type { TaskRowData } from "./types";

/** Shared Inbox/Today/Upcoming list; rows keep their familiar complete control. */
export function DailyTaskList({
  title,
  description,
  tasks,
  inbox = false,
  projects = [],
  empty,
  bare = false,
}: {
  title: string;
  description: string;
  tasks: TaskRowData[];
  inbox?: boolean;
  projects?: Array<{ id: string; name: string }>;
  empty: string;
  /** Embedded mode: the host page already provides gutters + page heading. */
  bare?: boolean;
}) {
  const { registerTaskCapture } = useTaskCapture();
  const [draft, setDraft] = React.useState("");
  const [rowsState, setRowsState] = React.useState(tasks);
  const [selected, setSelected] = React.useState<string | null>(tasks[0]?.id ?? null);
  const [busy, setBusy] = React.useState(false);
  const [destination, setDestination] = React.useState("");
  const captureInputRef = React.useRef<HTMLInputElement>(null);
  const selectedTask = rowsState.find((task) => task.id === selected) ?? null;

  const openInboxCapture = React.useCallback(() => {
    const frame = window.requestAnimationFrame(() => {
      captureInputRef.current?.focus();
      captureInputRef.current?.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  React.useEffect(() => {
    if (!inbox) return;
    return registerTaskCapture(openInboxCapture);
  }, [inbox, openInboxCapture, registerTaskCapture]);

  const [previousTasks, setPreviousTasks] = React.useState(tasks);
  if (previousTasks !== tasks) {
    setPreviousTasks(tasks);
    const pendingRows = rowsState.filter((task) =>
      task.id.startsWith("__pending_inbox_"),
    );
    setRowsState([...tasks, ...pendingRows]);
  }

  async function toggle(id: string, complete: boolean) {
    const previous = rowsState;
    setRowsState((current) =>
      current.map((task) =>
        task.id === id
          ? { ...task, status: complete ? "completed" : "active" }
          : task,
      ),
    );
    const result = complete ? await completeTaskAction(id) : await reopenTaskAction(id);
    if (!result.ok) {
      setRowsState(previous);
      toast.error(result.error.message);
    }
  }
  async function add(event: React.FormEvent) {
    event.preventDefault();
    const title = draft.trim();
    if (!title || busy) return;
    const pendingId = `__pending_inbox_${Date.now()}`;
    const pendingTask: TaskRowData = {
      id: pendingId,
      title,
      description: null,
      status: "active",
      priority: "p4",
      labels: [],
      sectionId: null,
      scheduledFor: null,
      overdue: false,
      owner: null,
    };
    setRowsState((current) => [...current, pendingTask]);
    setSelected(pendingId);
    setDraft("");
    setBusy(true);
    const result = await createInboxTaskAction({ title });
    setBusy(false);
    if (!result.ok) {
      setRowsState((current) =>
        current.filter((task) => task.id !== pendingId),
      );
      setSelected(null);
      setDraft(title);
      toast.error(result.error.message);
      return;
    }
    const savedTask: TaskRowData = {
      id: result.data.id,
      title: result.data.title,
      description: result.data.description,
      status: result.data.status,
      priority: result.data.priority,
      labels: [],
      sectionId: result.data.sectionId,
      parentTaskId: result.data.parentTaskId,
      scheduledFor: result.data.scheduledFor?.toISOString() ?? null,
      overdue: false,
      owner: null,
    };
    setRowsState((current) =>
      current.some((task) => task.id === savedTask.id)
        ? current.filter((task) => task.id !== pendingId)
        : current.map((task) => (task.id === pendingId ? savedTask : task)),
    );
    setSelected(savedTask.id);
  }
  async function moveToProject(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedTask || !destination || busy) return;
    const previous = rowsState;
    setRowsState((current) =>
      current.filter((task) => task.id !== selectedTask.id),
    );
    setBusy(true);
    const result = await moveTaskToProjectAction(selectedTask.id, destination);
    setBusy(false);
    if (!result.ok) {
      setRowsState(previous);
      toast.error(result.error.message ?? "Couldn't move the task.");
      return;
    }
    toast.success(`Moved “${selectedTask.title}” into the project.`);
    setDestination(""); setSelected(null);
  }

  const rows = (
    <>
      {inbox ? (
        <form
          onSubmit={add}
          className="mt-[var(--taskspace-space-section)] flex items-center gap-[var(--taskspace-space-control)] rounded-[var(--taskspace-radius-panel)] border border-border bg-[var(--taskspace-periwinkle-pale)] p-[var(--taskspace-space-control)]"
        >
          <label className="sr-only" htmlFor="inbox-title">
            New Inbox task
          </label>
          <input
            id="inbox-title"
            ref={captureInputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="ts-field min-w-0 flex-1"
            placeholder="Capture a task…"
          />
          <Button
            type="submit"
            disabled={busy}
            className="h-9 shrink-0 rounded-[var(--taskspace-radius-control)]"
          >
            <Plus className="size-4" />
            Add
          </Button>
        </form>
      ) : null}

      {rowsState.length ? (
        <div className="ts-panel mt-[var(--taskspace-space-section)] overflow-hidden px-[var(--taskspace-space-compact)]">
          {rowsState.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              selected={task.id === selected}
              onSelect={setSelected}
              onToggleComplete={toggle}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-[var(--taskspace-space-section)]"
          icon={<CheckCircle2 className="size-5" />}
          title={inbox ? "Inbox is clear" : "Nothing here yet"}
          description={empty}
        />
      )}

      {inbox && selectedTask && projects.length > 0 ? (
        <form
          onSubmit={moveToProject}
          className="mt-[var(--taskspace-space-section)] flex flex-wrap items-end gap-[var(--taskspace-space-control)] border-t border-border pt-[var(--taskspace-space-section)]"
        >
          <div className="min-w-0 flex-1">
            <label
              className="ts-label block"
              htmlFor="inbox-destination"
            >
              Move to project
            </label>
            <p className="ts-body mt-[var(--taskspace-space-micro)] truncate">
              {selectedTask.title}
            </p>
          </div>
          <select
            id="inbox-destination"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            className="ts-field h-9 w-full sm:w-auto sm:min-w-44"
          >
            <option value="">Choose a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <Button
            type="submit"
            disabled={!destination || busy}
            className="h-9 rounded-[var(--taskspace-radius-control)]"
          >
            Move
            <ArrowRight className="size-4" />
          </Button>
        </form>
      ) : null}
    </>
  );

  // Embedded in a host page that already owns the gutters + heading.
  if (bare) {
    return (
      <section className="mt-[var(--taskspace-space-content)]">
        <h2 className="ts-section">{title}</h2>
        {rows}
      </section>
    );
  }

  return (
    <main>
      <PageContainer width="wide">
        <PageHeader size="canvas" title={title} description={description} />
        {rows}
      </PageContainer>
    </main>
  );
}
