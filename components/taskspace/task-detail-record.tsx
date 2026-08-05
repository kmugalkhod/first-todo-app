"use client";

import * as React from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Flag,
  LoaderCircle,
  PencilLine,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { addCommentAction, deleteCommentAction } from "@/lib/server-actions/comments";
import {
  createLabelAction,
  deleteLabelAction,
  updateLabelAction,
} from "@/lib/server-actions/labels";
import {
  completeTaskAction,
  createTaskAction,
  reopenTaskAction,
  updateTaskDetailsAction,
} from "@/lib/server-actions/tasks";
import { TASKSPACE_LABEL_COLOUR } from "@/lib/taskspace-tokens";
import { cn } from "@/lib/utils";
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
  formatDueDate,
  initials,
  priorityPillClass,
  priorityLabel,
  type TaskRowData,
} from "./types";
import {
  appendSavedSubtask,
  isPendingSubtask,
  visibleSubtasks,
  type PendingSubtask,
  type SubtaskData,
} from "./task-subtasks";

const INPUT_CLASS =
  "w-full rounded-[var(--taskspace-radius-input)] border border-input bg-[var(--taskspace-paper)] px-2.5 text-[length:var(--taskspace-font-size-body)] text-[var(--taskspace-ink)] outline-none placeholder:text-[var(--taskspace-muted)] focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)]";
const PRIMARY_BUTTON_CLASS =
  "inline-flex h-[35px] items-center justify-center rounded-[var(--taskspace-radius-control)] bg-[var(--taskspace-cobalt)] px-3 text-xs font-extrabold text-white transition-colors hover:bg-[var(--taskspace-cobalt-deep)] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)] focus-visible:ring-offset-2";
type TaskEditDraft = {
  title: string;
  description: string;
  priority: TaskRowData["priority"];
  scheduledFor: string;
  assigneeId: string;
  labelIds: string[];
};
const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
  hour12: false,
});

function formatTimestamp(iso: string) {
  return TIMESTAMP_FORMATTER.format(new Date(iso));
}

function linkify(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, index) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-[var(--taskspace-cobalt)] underline decoration-[var(--taskspace-cobalt)]/35 underline-offset-2 hover:text-[var(--taskspace-cobalt-deep)]"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}

function Property({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-7 grid-cols-[84px_minmax(0,1fr)] items-center gap-2.5 text-[length:var(--taskspace-font-size-meta)] leading-4">
      <dt className="flex items-center gap-1.5 font-medium text-[var(--taskspace-muted)]">
        {icon}
        {label}
      </dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-1.5 font-semibold text-[var(--taskspace-ink)]">
        {children}
      </dd>
    </div>
  );
}

function RecordSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-[var(--taskspace-space-compact)]">
      <h3 className="text-[length:var(--taskspace-font-size-body)] font-bold tracking-[-0.015em] text-[var(--taskspace-ink)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function TaskDetailRecord({
  task,
  projectName,
  projectId,
  sectionName,
  meUserId,
  onClose,
  onDelete,
  canEdit = false,
  members = [],
  availableLabels = [],
  canModerateComments = false,
  onSelectTask,
  onResolveOptimisticTask,
  onTaskChange,
  onToggleComplete,
  onMove,
  canMoveUp = false,
  canMoveDown = false,
}: {
  task: TaskRowData;
  projectName: string;
  projectId: string;
  sectionName: string | null;
  meUserId?: string | null;
  onClose?: () => void;
  onDelete?: (taskId: string) => void;
  canEdit?: boolean;
  members?: Array<{ id: string; name: string }>;
  availableLabels?: Array<{ id: string; name: string }>;
  canModerateComments?: boolean;
  onSelectTask?: (task: TaskRowData) => void;
  onResolveOptimisticTask?: (
    pendingId: string,
    task: TaskRowData | null,
    parentTaskId: string,
  ) => void;
  onTaskChange?: (taskId: string, patch: Partial<TaskRowData>) => void;
  onToggleComplete?: (taskId: string, complete: boolean) => void;
  onMove?: (direction: "up" | "down") => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const [comment, setComment] = React.useState("");
  const [visibleComments, setVisibleComments] = React.useState(
    task.comments ?? [],
  );
  const [commentSource, setCommentSource] = React.useState(task.comments);
  const [postingComment, setPostingComment] = React.useState(false);
  const [addingSubtask, setAddingSubtask] = React.useState(false);
  const [subtaskBusyIds, setSubtaskBusyIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [labelName, setLabelName] = React.useState("");
  const [creatingLabel, setCreatingLabel] = React.useState(false);
  const [visibleLabelOptions, setVisibleLabelOptions] = React.useState(
    availableLabels,
  );
  const [labelOptionsSource, setLabelOptionsSource] =
    React.useState(availableLabels);
  const [subtaskTitle, setSubtaskTitle] = React.useState("");
  const [optimisticSubtasks, setOptimisticSubtasks] = React.useState<
    PendingSubtask[]
  >([]);
  const [subtaskStatusOverrides, setSubtaskStatusOverrides] = React.useState<
    Record<string, SubtaskData["status"]>
  >({});
  const [editDraft, setEditDraft] = React.useState<TaskEditDraft | null>(null);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [isSavePending, startSaveTransition] = React.useTransition();
  if (commentSource !== task.comments) {
    setCommentSource(task.comments);
    setVisibleComments(task.comments ?? []);
  }
  if (labelOptionsSource !== availableLabels) {
    setLabelOptionsSource(availableLabels);
    setVisibleLabelOptions(availableLabels);
  }
  const editing = editDraft !== null;
  const completed = task.status === "completed";
  const isOwnedByMe = task.owner?.id != null && task.owner.id === meUserId;
  const dueLabel = formatDueDate(task.scheduledFor);
  const subtasks = visibleSubtasks(
    task.subtasks ?? [],
    optimisticSubtasks,
  ).map((subtask) => ({
    ...subtask,
    status: subtaskStatusOverrides[subtask.id] ?? subtask.status,
  }));
  const subtaskProgress = subtasks.length
    ? {
        completed: subtasks.filter((subtask) => subtask.status === "completed").length,
        total: subtasks.length,
      }
    : undefined;

  function startEditing() {
    setEditDraft({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      scheduledFor: task.scheduledFor?.slice(0, 10) ?? "",
      assigneeId: task.owner?.id ?? "",
      labelIds: task.labels.map((label) => label.id),
    });
  }

  function submitTaskUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editDraft) return;
    const title = editDraft.title.trim();
    if (!title) {
      toast.error("Give this task a title before saving.");
      return;
    }

    const scheduledFor = editDraft.scheduledFor
      ? new Date(editDraft.scheduledFor)
      : null;
    const scheduledForIso = scheduledFor?.toISOString() ?? null;
    const owner = editDraft.assigneeId
      ? members.find((member) => member.id === editDraft.assigneeId) ?? null
      : null;
    const selectedLabels = visibleLabelOptions.filter((label) =>
      editDraft.labelIds.includes(label.id),
    );
    const previous = {
      title: task.title,
      description: task.description,
      priority: task.priority,
      scheduledFor: task.scheduledFor,
      overdue: task.overdue,
      owner: task.owner,
      labels: task.labels,
    };
    const next = {
      title,
      description: editDraft.description.trim() || null,
      priority: editDraft.priority,
      scheduledFor: scheduledForIso,
      overdue:
        scheduledFor != null &&
        scheduledFor.getTime() <
          new Date(new Date().setHours(0, 0, 0, 0)).getTime(),
      owner,
      labels: selectedLabels,
    };
    onTaskChange?.(task.id, next);

    startSaveTransition(async () => {
      try {
        const result = await updateTaskDetailsAction(task.id, {
          title,
          description: next.description,
          priority: editDraft.priority,
          scheduledFor,
          assigneeId: editDraft.assigneeId || null,
          labelIds: editDraft.labelIds,
        });
        if (!result.ok) {
          onTaskChange?.(task.id, previous);
          toast.error(result.error.message ?? "Couldn't update the task.");
          return;
        }
        setEditDraft(null);
        toast.success("Task updated");
      } catch {
        onTaskChange?.(task.id, previous);
        toast.error("Couldn't update the task. Your changes are still here.");
      }
    });
  }

  async function submitComment(event: React.FormEvent) {
    event.preventDefault();
    const body = comment.trim();
    if (!body) return;
    const previous = visibleComments;
    const pendingId = `__pending_comment_${Date.now()}`;
    const optimisticComment = {
      id: pendingId,
      authorId: meUserId ?? null,
      author:
        members.find((member) => member.id === meUserId)?.name ?? "You",
      body,
      createdAt: new Date().toISOString(),
    };
    const optimisticComments = [...previous, optimisticComment];
    setVisibleComments(optimisticComments);
    onTaskChange?.(task.id, { comments: optimisticComments });
    setComment("");
    setPostingComment(true);
    let result: Awaited<ReturnType<typeof addCommentAction>>;
    try {
      result = await addCommentAction(task.id, { body });
    } catch {
      setPostingComment(false);
      setVisibleComments(previous);
      onTaskChange?.(task.id, { comments: previous });
      setComment(body);
      toast.error("Couldn't post the comment. Try again.");
      return;
    }
    setPostingComment(false);
    if (!result.ok) {
      setVisibleComments(previous);
      onTaskChange?.(task.id, { comments: previous });
      setComment(body);
      toast.error(result.error.message ?? "Couldn't post the comment.");
      return;
    }
    const savedComment = {
      id: result.data.id,
      authorId: result.data.author?.id ?? null,
      author: result.data.author?.name ?? optimisticComment.author,
      body: result.data.body,
      createdAt: new Date(result.data.createdAt).toISOString(),
    };
    const savedComments = optimisticComments.map((item) =>
      item.id === pendingId ? savedComment : item,
    );
    setVisibleComments(savedComments);
    onTaskChange?.(task.id, { comments: savedComments });
  }

  async function removeComment(commentId: string) {
    const previous = visibleComments;
    const next = previous.filter((item) => item.id !== commentId);
    setVisibleComments(next);
    onTaskChange?.(task.id, { comments: next });
    const result = await deleteCommentAction(commentId);
    if (!result.ok) {
      setVisibleComments(previous);
      onTaskChange?.(task.id, { comments: previous });
      toast.error(result.error.message ?? "Couldn't delete the comment.");
    }
  }

  async function createLabel() {
    const name = labelName.trim();
    if (!name || creatingLabel) return;
    const previous = visibleLabelOptions;
    const pendingId = `__pending_label_${Date.now()}`;
    setVisibleLabelOptions([...previous, { id: pendingId, name }]);
    setLabelName("");
    setCreatingLabel(true);
    try {
      const result = await createLabelAction(projectId, {
        name,
        colour: TASKSPACE_LABEL_COLOUR,
      });
      if (!result.ok) {
        setVisibleLabelOptions(previous);
        setLabelName(name);
        toast.error(result.error.message ?? "Couldn't create the label.");
        return;
      }
      setVisibleLabelOptions((current) =>
        current.map((label) =>
          label.id === pendingId
            ? { id: result.data.id, name: result.data.name }
            : label,
        ),
      );
      setEditDraft((current) =>
        current
          ? {
              ...current,
              labelIds: [
                ...current.labelIds.filter((id) => id !== pendingId),
                result.data.id,
              ],
            }
          : current,
      );
    } catch {
      setVisibleLabelOptions(previous);
      setLabelName(name);
      toast.error("Couldn't create the label. Try again.");
    } finally {
      setCreatingLabel(false);
    }
  }

  function toggleLabel(labelId: string, checked: boolean) {
    setEditDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        labelIds: checked
          ? [...new Set([...current.labelIds, labelId])]
          : current.labelIds.filter((id) => id !== labelId),
      };
    });
  }

  async function renameLabel(label: { id: string; name: string }) {
    const name = window.prompt("Rename label", label.name)?.trim();
    if (!name || name === label.name) return;
    const previousOptions = visibleLabelOptions;
    const previousTaskLabels = task.labels;
    setVisibleLabelOptions((current) =>
      current.map((item) =>
        item.id === label.id ? { ...item, name } : item,
      ),
    );
    onTaskChange?.(task.id, {
      labels: task.labels.map((item) =>
        item.id === label.id ? { ...item, name } : item,
      ),
    });
    try {
      const result = await updateLabelAction(label.id, { name });
      if (!result.ok) {
        setVisibleLabelOptions(previousOptions);
        onTaskChange?.(task.id, { labels: previousTaskLabels });
        toast.error(result.error.message ?? "Couldn't rename the label.");
      }
    } catch {
      setVisibleLabelOptions(previousOptions);
      onTaskChange?.(task.id, { labels: previousTaskLabels });
      toast.error("Couldn't rename the label. Try again.");
    }
  }

  async function removeLabel(label: { id: string; name: string }) {
    const previousOptions = visibleLabelOptions;
    const previousTaskLabels = task.labels;
    setVisibleLabelOptions((current) =>
      current.filter((item) => item.id !== label.id),
    );
    setEditDraft((current) =>
      current
        ? {
            ...current,
            labelIds: current.labelIds.filter((id) => id !== label.id),
          }
        : current,
    );
    onTaskChange?.(task.id, {
      labels: task.labels.filter((item) => item.id !== label.id),
    });
    try {
      const result = await deleteLabelAction(label.id);
      if (!result.ok) {
        setVisibleLabelOptions(previousOptions);
        onTaskChange?.(task.id, { labels: previousTaskLabels });
        toast.error(result.error.message ?? "Couldn't delete the label.");
      }
    } catch {
      setVisibleLabelOptions(previousOptions);
      onTaskChange?.(task.id, { labels: previousTaskLabels });
      toast.error("Couldn't delete the label. Try again.");
    }
  }

  async function addSubtask(event: React.FormEvent) {
    event.preventDefault();
    const title = subtaskTitle.trim();
    if (!title || addingSubtask) return;
    const pendingId = `__pending_subtask_${Date.now()}`;
    const pendingSubtask: PendingSubtask = {
      id: pendingId,
      title,
      status: "active",
      serverIdsAtSubmit: (task.subtasks ?? []).map((subtask) => subtask.id),
    };
    setOptimisticSubtasks((current) => [...current, pendingSubtask]);
    setSubtaskTitle("");
    setAddingSubtask(true);
    try {
      const result = await createTaskAction(projectId, {
        title,
        sectionId: task.sectionId,
        parentTaskId: task.id,
      });
      if (!result.ok) {
        setOptimisticSubtasks((current) =>
          current.filter((subtask) => subtask.id !== pendingId),
        );
        onResolveOptimisticTask?.(pendingId, null, task.id);
        setSubtaskTitle(title);
        toast.error(result.error.message ?? "Couldn't add the subtask.");
        return;
      }
      const createdTask: TaskRowData = {
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
      const savedSubtask: SubtaskData = {
        id: result.data.id,
        title: result.data.title,
        status: result.data.status,
      };
      const nextSubtasks = appendSavedSubtask(
        task.subtasks ?? [],
        savedSubtask,
      );
      setOptimisticSubtasks((current) =>
        current.filter((subtask) => subtask.id !== pendingId),
      );
      onTaskChange?.(task.id, {
        subtasks: nextSubtasks,
        subtaskProgress: {
          completed: nextSubtasks.filter(
            (subtask) => subtask.status === "completed",
          ).length,
          total: nextSubtasks.length,
        },
      });
      onResolveOptimisticTask?.(pendingId, createdTask, task.id);
    } catch {
      setOptimisticSubtasks((current) =>
        current.filter((subtask) => subtask.id !== pendingId),
      );
      onResolveOptimisticTask?.(pendingId, null, task.id);
      setSubtaskTitle(title);
      toast.error("Couldn't add the subtask. Try again.");
    } finally {
      setAddingSubtask(false);
    }
  }

  async function toggleSubtask(subtask: SubtaskData) {
    if (isPendingSubtask(subtask) || subtaskBusyIds.has(subtask.id)) return;
    const previousStatus = subtask.status;
    const nextStatus: SubtaskData["status"] =
      previousStatus === "completed" ? "active" : "completed";
    setSubtaskStatusOverrides((current) => ({
      ...current,
      [subtask.id]: nextStatus,
    }));
    setSubtaskBusyIds((current) => new Set(current).add(subtask.id));
    const nextSubtasks = subtasks.map((item) =>
      item.id === subtask.id ? { ...item, status: nextStatus } : item,
    );
    onTaskChange?.(task.id, {
      subtasks: nextSubtasks,
      subtaskProgress: {
        completed: nextSubtasks.filter((item) => item.status === "completed")
          .length,
        total: nextSubtasks.length,
      },
    });
    const restorePreviousStatus = () => {
      setSubtaskStatusOverrides((current) => ({
        ...current,
        [subtask.id]: previousStatus,
      }));
      const restoredSubtasks = subtasks.map((item) =>
        item.id === subtask.id ? { ...item, status: previousStatus } : item,
      );
      onTaskChange?.(task.id, {
        subtasks: restoredSubtasks,
        subtaskProgress: {
          completed: restoredSubtasks.filter(
            (item) => item.status === "completed",
          ).length,
          total: restoredSubtasks.length,
        },
      });
    };
    try {
      const result =
        nextStatus === "completed"
          ? await completeTaskAction(subtask.id)
          : await reopenTaskAction(subtask.id);
      if (!result.ok) {
        restorePreviousStatus();
        toast.error(result.error.message ?? "Couldn't update the subtask.");
      }
    } catch {
      restorePreviousStatus();
      toast.error("Couldn't update the subtask. Try again.");
    } finally {
      setSubtaskBusyIds((current) => {
        const next = new Set(current);
        next.delete(subtask.id);
        return next;
      });
    }
  }

  return (
    <aside
      aria-label="Task detail"
      className="flex min-h-full flex-col gap-[var(--taskspace-space-section)] border-l border-border bg-[var(--taskspace-periwinkle-pale)] px-[var(--taskspace-space-section)] pb-[var(--taskspace-space-content)] pt-[var(--taskspace-space-section)] motion-safe:animate-in motion-safe:fade-in [animation-duration:var(--taskspace-motion-panel)] max-[620px]:border-l-0 max-[620px]:pb-[calc(var(--taskspace-space-content)+env(safe-area-inset-bottom))]"
    >
      <div className="sticky -top-px z-10 -mx-[var(--taskspace-space-section)] -mt-[var(--taskspace-space-section)] border-b border-border bg-[var(--taskspace-periwinkle-pale)] px-[var(--taskspace-space-section)] pb-[var(--taskspace-space-compact)] pt-[var(--taskspace-space-section)]">
        <span className="mx-auto mb-[var(--taskspace-space-compact)] hidden h-1 w-9 rounded-full bg-[var(--taskspace-ink-faint)] max-[620px]:block" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[length:var(--taskspace-font-size-micro)] font-extrabold uppercase tracking-[var(--taskspace-tracking-label)] text-[var(--taskspace-cobalt)]">
            {projectName}
            {sectionName ? ` / ${sectionName}` : ""}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {canEdit && onToggleComplete ? (
              <button
                type="button"
                aria-pressed={completed}
                onClick={() => onToggleComplete(task.id, !completed)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-[var(--taskspace-radius-control)] border border-border bg-[var(--taskspace-paper)] px-2 text-[length:var(--taskspace-font-size-micro)] font-extrabold text-[var(--taskspace-cobalt)] transition-[background-color,color,transform] [transition-duration:var(--taskspace-motion-fast)] [transition-timing-function:var(--taskspace-ease-out)] hover:bg-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)] focus-visible:ring-offset-2 motion-reduce:transition-none",
                  completed && "text-[var(--taskspace-muted)]",
                )}
              >
                <CheckCircle2 className="size-3.5" />
                {completed ? "Reopen" : "Complete"}
              </button>
            ) : null}
            {canEdit ? (
              <button
                type="button"
                aria-pressed={editing}
                onClick={editing ? () => setEditDraft(null) : startEditing}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--taskspace-radius-control)] px-2 text-[length:var(--taskspace-font-size-micro)] font-extrabold text-[var(--taskspace-cobalt)] transition-[background-color,color,transform] [transition-duration:var(--taskspace-motion-fast)] [transition-timing-function:var(--taskspace-ease-out)] hover:bg-[var(--taskspace-paper)] hover:text-[var(--taskspace-cobalt-deep)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)] focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                <PencilLine className="size-3.5" />
                {editing ? "Cancel edit" : "Edit task"}
              </button>
            ) : null}
            {onClose ? (
              <button
                type="button"
                aria-label="Close task details"
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-[var(--taskspace-radius-control)] text-[var(--taskspace-muted)] transition-[background-color,color,transform] [transition-duration:var(--taskspace-motion-fast)] [transition-timing-function:var(--taskspace-ease-out)] hover:bg-[var(--taskspace-paper)] hover:text-[var(--taskspace-cobalt-deep)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)] focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {editing && editDraft ? (
        <form
          onSubmit={submitTaskUpdate}
          className="grid gap-[var(--taskspace-space-compact)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 [animation-duration:var(--taskspace-motion-panel)]"
        >
          <label className="grid gap-1.5 text-[length:var(--taskspace-font-size-micro)] font-extrabold text-[var(--taskspace-muted)]" htmlFor={`title-${task.id}`}>
            Task title
            <input
              autoFocus
              id={`title-${task.id}`}
              value={editDraft.title}
              onChange={(event) => setEditDraft({ ...editDraft, title: event.target.value })}
              required
              className={cn(INPUT_CLASS, "h-[35px]")}
            />
          </label>
          <label className="grid gap-1.5 text-[length:var(--taskspace-font-size-micro)] font-extrabold text-[var(--taskspace-muted)]">
            Description
            <textarea
              value={editDraft.description}
              onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })}
              placeholder="Add the context a collaborator needs"
              className={cn(INPUT_CLASS, "min-h-24 py-2")}
            />
          </label>
          <div className="grid grid-cols-2 gap-[var(--taskspace-space-tight)]">
            <label className="grid gap-1.5 text-[length:var(--taskspace-font-size-micro)] font-extrabold text-[var(--taskspace-muted)]">
              Priority
              <select
                value={editDraft.priority}
                onChange={(event) => setEditDraft({ ...editDraft, priority: event.target.value as TaskRowData["priority"] })}
                className={cn(INPUT_CLASS, "h-[35px]")}
              >
                <option value="p1">P1 · Urgent</option>
                <option value="p2">P2 · High</option>
                <option value="p3">P3 · Normal</option>
                <option value="p4">P4 · Low</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-[length:var(--taskspace-font-size-micro)] font-extrabold text-[var(--taskspace-muted)]">
              Planned date
              <input
                type="date"
                value={editDraft.scheduledFor}
                onChange={(event) => setEditDraft({ ...editDraft, scheduledFor: event.target.value })}
                className={cn(INPUT_CLASS, "h-[35px]")}
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-[length:var(--taskspace-font-size-micro)] font-extrabold text-[var(--taskspace-muted)]">
            Assignee
            <select
              value={editDraft.assigneeId}
              onChange={(event) => setEditDraft({ ...editDraft, assigneeId: event.target.value })}
              className={cn(INPUT_CLASS, "h-[35px]")}
            >
              <option value="">Unassigned</option>
              {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          </label>
          <fieldset className="border-y border-border py-[var(--taskspace-space-compact)]">
            <legend className="px-1 text-[length:var(--taskspace-font-size-micro)] font-extrabold text-[var(--taskspace-muted)]">Labels</legend>
            {visibleLabelOptions.length ? (
              <div className="flex flex-wrap gap-[var(--taskspace-space-tight)]">
                {visibleLabelOptions.map((label) => {
                  const applied = editDraft.labelIds.includes(label.id);
                  return (
                    <div key={label.id} className={cn("inline-flex min-h-8 items-center gap-1 rounded-[var(--taskspace-radius-control)] border px-2 text-[length:var(--taskspace-font-size-micro)] font-bold", applied ? "border-[var(--taskspace-cobalt)] bg-[var(--taskspace-paper)] text-[var(--taskspace-cobalt-deep)]" : "border-border text-[var(--taskspace-muted)]")}>
                      <input
                        type="checkbox"
                        aria-label={`Apply label ${label.name}`}
                        checked={applied}
                        disabled={label.id.startsWith("__pending_label_")}
                        onChange={(event) => toggleLabel(label.id, event.currentTarget.checked)}
                      />
                      <span>{label.name}</span>
                      <button type="button" aria-label={`Rename ${label.name}`} disabled={label.id.startsWith("__pending_label_")} onClick={() => void renameLabel(label)} className="rounded-[var(--taskspace-radius-chip)] px-1 text-[var(--taskspace-cobalt)] hover:bg-[var(--taskspace-periwinkle-pale)]">Rename</button>
                      <button type="button" aria-label={`Delete label ${label.name}`} disabled={label.id.startsWith("__pending_label_")} onClick={() => void removeLabel(label)} className="rounded-[var(--taskspace-radius-chip)] px-1 text-[var(--taskspace-coral)] hover:bg-[var(--taskspace-coral)]/10">Delete</button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[length:var(--taskspace-font-size-body)] text-[var(--taskspace-muted)]">No project labels yet.</p>
            )}
            <div className="mt-[var(--taskspace-space-control)] flex gap-2">
              <label className="sr-only" htmlFor={`label-${task.id}`}>New label</label>
              <input id={`label-${task.id}`} value={labelName} onChange={(event) => setLabelName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void createLabel(); } }} className={cn(INPUT_CLASS, "h-[35px] min-w-0 flex-1")} placeholder="Create a label" />
              <button type="button" disabled={creatingLabel || !labelName.trim()} onClick={() => void createLabel()} className={PRIMARY_BUTTON_CLASS}>{creatingLabel ? "Creating…" : "Create"}</button>
            </div>
          </fieldset>
          <div className="flex items-center gap-[var(--taskspace-space-tight)]">
            <button
              type="submit"
              disabled={isSavePending}
              className={PRIMARY_BUTTON_CLASS}
            >
              {isSavePending ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              disabled={isSavePending}
              onClick={() => setEditDraft(null)}
              className="inline-flex h-[35px] items-center justify-center rounded-[var(--taskspace-radius-control)] border border-border bg-[var(--taskspace-paper)] px-3 text-xs font-extrabold text-[var(--taskspace-muted)] hover:text-[var(--taskspace-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div>
            <h2 className={cn("font-heading text-[length:var(--taskspace-font-size-title)] font-extrabold leading-[1.06] tracking-[-0.04em] text-[var(--taskspace-ink)]", completed && "text-[var(--taskspace-muted)] line-through")}>
              {task.title}
            </h2>
            {task.description ? (
              <p className="mt-[var(--taskspace-space-control)] whitespace-pre-wrap text-[length:var(--taskspace-font-size-body)] leading-6 text-[var(--taskspace-muted)]">{task.description}</p>
            ) : (
              <p className="mt-[var(--taskspace-space-control)] text-[length:var(--taskspace-font-size-body)] italic leading-5 text-[var(--taskspace-muted)]">No description yet. Add the context a collaborator needs before they begin.</p>
            )}
          </div>
          <dl className="grid gap-[var(--taskspace-space-tight)] border-y border-border py-[var(--taskspace-space-compact)]">
            <Property label="Assignee" icon={<User className="size-3.5" />}>
              {task.owner ? (
                <><span className={cn("flex size-[21px] items-center justify-center rounded-full text-[length:var(--taskspace-font-size-chip)] font-extrabold text-[var(--taskspace-cobalt-deep)]", isOwnedByMe ? "bg-[var(--taskspace-citron)]" : "bg-[var(--taskspace-paper)]")}>{initials(task.owner.name)}</span>{task.owner.name}</>
              ) : "Unassigned"}
            </Property>
            <Property label="Planned" icon={<CalendarDays className="size-3.5" />}>
              <span className={cn(task.overdue && "text-[var(--taskspace-coral)]")}>{task.scheduledFor ? task.overdue ? `Overdue · ${dueLabel}` : dueLabel : "No date"}</span>
            </Property>
            <Property label="Priority" icon={<Flag className="size-3.5" />}>
              <span className={cn("inline-flex h-5 items-center rounded-[var(--taskspace-radius-chip)] px-1.5 text-[length:var(--taskspace-font-size-micro)] font-extrabold", priorityPillClass(task.priority))}>{priorityLabel(task.priority)}</span>
            </Property>
            <Property label="Labels" icon={<Tag className="size-3.5" />}>
              {task.labels.length ? task.labels.map((label) => <span key={label.id} className="inline-flex h-5 items-center rounded-[var(--taskspace-radius-chip)] bg-[var(--taskspace-paper)] px-1.5 text-[length:var(--taskspace-font-size-micro)] font-extrabold text-[var(--taskspace-cobalt-deep)]">{label.name}</span>) : "No labels"}
            </Property>
          </dl>
        </>
      )}

      <RecordSection title="Subtasks">
        <p className="mt-1.5 text-[length:var(--taskspace-font-size-body)] leading-5 text-[var(--taskspace-muted)]">
          {subtaskProgress
            ? `${subtaskProgress.completed} of ${subtaskProgress.total} complete.`
            : "Break this task into smaller, independently completable work."}
        </p>
        {subtasks.length ? (
          <ul className="mt-3 space-y-2" aria-label="Subtasks">
            {subtasks.map((subtask) => {
              const isComplete = subtask.status === "completed";
              const isPending = isPendingSubtask(subtask);
              return (
                <li key={subtask.id} aria-busy={isPending || undefined} className="flex min-h-8 items-center gap-1.5 text-[length:var(--taskspace-font-size-body)]">
                  <button
                    type="button"
                    aria-pressed={isComplete}
                    aria-label={isPending ? `Saving subtask ${subtask.title}` : `${isComplete ? "Reopen" : "Complete"} subtask ${subtask.title}`}
                    disabled={!canEdit || isPending || subtaskBusyIds.has(subtask.id)}
                    onClick={() => void toggleSubtask(subtask)}
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border border-[var(--taskspace-muted)] transition-[background-color,border-color,transform] duration-150 active:scale-90 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)] motion-reduce:transition-none",
                      isComplete && "border-[var(--taskspace-completion-green)] bg-[var(--taskspace-completion-green)] text-white",
                    )}
                  >
                    {isComplete ? <CheckCircle2 className="size-3" /> : null}
                  </button>
                  <button
                    type="button"
                    aria-label={isPending ? `Saving subtask ${subtask.title}` : `Open subtask ${subtask.title}`}
                    disabled={isPending}
                    onClick={() =>
                      onSelectTask?.({
                        id: subtask.id,
                        title: subtask.title,
                        description: null,
                        status: subtask.status,
                        priority: "p4",
                        labels: [],
                        sectionId: task.sectionId,
                        parentTaskId: task.id,
                        scheduledFor: null,
                        overdue: false,
                        owner: null,
                      })
                    }
                    className={cn(
                      "flex min-h-8 min-w-0 flex-1 items-center break-words rounded-[var(--taskspace-radius-input)] px-1.5 text-left text-[var(--taskspace-ink)] transition-[background-color,color,transform] duration-150 hover:bg-[var(--taskspace-paper)] hover:text-[var(--taskspace-cobalt)] active:scale-[0.99] disabled:cursor-wait disabled:text-[var(--taskspace-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)] focus-visible:ring-offset-1 motion-reduce:transition-none",
                      isComplete && "text-[var(--taskspace-muted)] line-through",
                    )}
                  >
                    {subtask.title}
                  </button>
                  {isPending ? (
                    <span role="status" className="shrink-0">
                      <LoaderCircle
                        aria-hidden="true"
                        className="size-3.5 animate-spin text-[var(--taskspace-muted)] motion-reduce:animate-none"
                      />
                      <span className="sr-only">Saving {subtask.title}</span>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        {canEdit ? (
          <form onSubmit={addSubtask} className="mt-3 flex gap-2">
            <label className="sr-only" htmlFor={`subtask-${task.id}`}>New subtask</label>
            <input id={`subtask-${task.id}`} value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} disabled={addingSubtask} placeholder="Add a subtask" className={cn(INPUT_CLASS, "h-[35px] min-w-0 flex-1")} />
            <button disabled={addingSubtask} className={PRIMARY_BUTTON_CLASS}>Add</button>
          </form>
        ) : null}
      </RecordSection>

      <RecordSection title="Comments">
        {visibleComments.length ? (
          <div className="mt-3 space-y-3">
            {visibleComments.map((item) => (
              <article key={item.id} className="border-b border-border/80 pb-3 last:border-b-0 last:pb-0">
                <p className="text-[length:var(--taskspace-font-size-micro)] font-extrabold text-[var(--taskspace-ink)]">
                  {item.author}
                  <time dateTime={item.createdAt} className="ml-1.5 font-semibold text-[var(--taskspace-muted)]">
                    {formatTimestamp(item.createdAt)}
                  </time>
                  {item.authorId === meUserId || canModerateComments ? (
                    <button type="button" onClick={() => void removeComment(item.id)} className="ml-2 font-bold text-[var(--taskspace-coral)] underline underline-offset-2">
                      Delete
                    </button>
                  ) : null}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-[length:var(--taskspace-font-size-body)] leading-5 text-[var(--taskspace-muted)]">{linkify(item.body)}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-1.5 text-[length:var(--taskspace-font-size-body)] leading-5 text-[var(--taskspace-muted)]">No comments yet. Keep progress where the project can find it.</p>
        )}
        {canEdit ? (
          <form onSubmit={submitComment} className="mt-3 flex items-end gap-2">
            <label className="sr-only" htmlFor={`comment-${task.id}`}>Add a comment</label>
            <textarea id={`comment-${task.id}`} value={comment} onChange={(event) => setComment(event.target.value)} className={cn(INPUT_CLASS, "h-[35px] min-h-[35px] flex-1 resize-none py-2")} placeholder="Add a comment" />
            <button disabled={postingComment} className={PRIMARY_BUTTON_CLASS}>Add</button>
          </form>
        ) : null}
      </RecordSection>

      <details
        className="group border-t border-border pt-[var(--taskspace-space-compact)]"
        open={subtasks.length === 0 && visibleComments.length === 0}
      >
        <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between rounded-[var(--taskspace-radius-input)] text-[length:var(--taskspace-font-size-body)] font-bold tracking-[-0.015em] text-[var(--taskspace-ink)] hover:text-[var(--taskspace-cobalt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)] [&::-webkit-details-marker]:hidden">
          <span>
            Activity
            <span className="ml-1.5 text-[length:var(--taskspace-font-size-micro)] font-extrabold text-[var(--taskspace-muted)]">
              {task.activity?.length ?? 0}
            </span>
          </span>
          <ChevronDown className="size-4 text-[var(--taskspace-muted)] transition-transform [transition-duration:var(--taskspace-motion-fast)] group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        {task.activity?.length ? (
          <ol className="mt-3 space-y-2.5">
            {task.activity.map((item) => (
              <li key={item.id} className="grid grid-cols-[6px_minmax(0,1fr)] gap-2.5 text-[length:var(--taskspace-font-size-body)] leading-5 text-[var(--taskspace-muted)]">
                <span className="mt-[7px] size-1.5 rounded-full bg-[var(--taskspace-coral)]" aria-hidden="true" />
                <span><strong className="font-extrabold text-[var(--taskspace-ink)]">{item.actor}</strong> {item.action} <time dateTime={item.createdAt}>{formatTimestamp(item.createdAt)}</time></span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-1.5 text-[length:var(--taskspace-font-size-body)] text-[var(--taskspace-muted)]">No activity yet.</p>
        )}
      </details>

      {onMove ? (
        <div className="flex items-center gap-[var(--taskspace-space-tight)] border-t border-border pt-[var(--taskspace-space-compact)]">
          <span className="text-[length:var(--taskspace-font-size-micro)] font-extrabold tracking-[var(--taskspace-tracking-label)] text-[var(--taskspace-muted)]">ORDER</span>
          <button type="button" disabled={!canMoveUp} onClick={() => onMove("up")} className="rounded-[var(--taskspace-radius-input)] border border-border bg-[var(--taskspace-paper)] px-2 py-1 text-[length:var(--taskspace-font-size-micro)] font-extrabold text-[var(--taskspace-cobalt)] hover:bg-[var(--taskspace-periwinkle-pale)] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)]">Move up</button>
          <button type="button" disabled={!canMoveDown} onClick={() => onMove("down")} className="rounded-[var(--taskspace-radius-input)] border border-border bg-[var(--taskspace-paper)] px-2 py-1 text-[length:var(--taskspace-font-size-micro)] font-extrabold text-[var(--taskspace-cobalt)] hover:bg-[var(--taskspace-periwinkle-pale)] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)]">Move down</button>
        </div>
      ) : null}

      {onDelete ? (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="mt-auto inline-flex items-center gap-1.5 self-start rounded-[var(--taskspace-radius-input)] px-2 py-1 text-[length:var(--taskspace-font-size-micro)] font-extrabold text-[var(--taskspace-coral)] transition-colors hover:bg-[var(--taskspace-coral)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)] focus-visible:ring-offset-1"
        >
          <Trash2 className="size-3.5" />
          Delete task
        </button>
      ) : null}

      <AlertDialog
        open={confirmingDelete}
        onOpenChange={(open) => setConfirmingDelete(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{task.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the task. Its subtasks will remain in
              the project without this parent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep task</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              onClick={() => {
                setConfirmingDelete(false);
                onDelete?.(task.id);
              }}
            >
              Delete task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
