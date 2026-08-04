"use client";

import { Check, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  formatDueDate,
  initials,
  priorityLabel,
  type TaskRowData,
} from "./types";

/**
 * Task 0301 — the compact paper task row (DESIGN.md "Task Rows").
 *
 * A flat, scan-first row: circular completion control, title/subtitle block,
 * priority pill, green label chips, due information and an owner avatar. It is
 * deliberately reusable (expected to be shared by the project view and the Story
 * 04 daily views) and stays flat per the design's "Don't" guidance — thin
 * dividers, no raised cards. The pale selected highlight is applied by the
 * parent, not hard-coded here.
 *
 * Accessibility (NFR): completion is never colour-only — the control is a real
 * two-state button with `aria-pressed`, a filled/empty diamond, and the title
 * gets strikethrough when completed.
 */
export function TaskRow({
  task,
  selected,
  meUserId,
  onSelect,
  onToggleComplete,
  onDelete,
  onMove,
  canMoveUp = false,
  canMoveDown = false,
}: {
  task: TaskRowData;
  selected: boolean;
  /** Used to raise the citron ownership marker for the current user's tasks. */
  meUserId?: string | null;
  onSelect: (taskId: string) => void;
  onToggleComplete: (taskId: string, complete: boolean) => void;
  /** Deletes the task; render the trailing trash affordance only when provided. */
  onDelete?: (taskId: string) => void;
  /** Accessible manual ordering controls; drag is intentionally not required. */
  onMove?: (taskId: string, direction: "up" | "down") => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const completed = task.status === "completed";
  const dueLabel = formatDueDate(task.scheduledFor);
  const isOwnedByMe = task.owner?.id != null && task.owner.id === meUserId;

  const surface =
    "group grid min-h-[62px] grid-cols-[21px_minmax(0,1fr)_auto_auto_auto_auto_auto_26px] items-center gap-3 border-b border-border px-2";

  return (
    <article
      className={cn(
        surface,
        "transition-colors hover:bg-[var(--taskspace-periwinkle-pale)]/50",
        selected && "rounded-[var(--taskspace-radius-panel)] border-b-transparent bg-[var(--taskspace-periwinkle-pale)]/70",
      )}
    >
      <button
        type="button"
        aria-pressed={completed}
        aria-label={
          completed
            ? `Reopen "${task.title}"`
            : `Mark "${task.title}" as complete`
        }
        onClick={() => onToggleComplete(task.id, !completed)}
        className={cn(
          "flex size-[19px] shrink-0 items-center justify-center rounded-full border-2 border-[var(--taskspace-muted)]/60 bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--taskspace-coral)] focus-visible:ring-offset-2 hover:border-primary",
          completed && "border-primary bg-primary text-primary-foreground",
        )}
      >
        {completed ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </button>

      <button
        type="button"
        onClick={() => onSelect(task.id)}
        className="min-w-0 rounded-md text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#ff765d] focus-visible:ring-offset-2"
      >
        <strong
          className={cn(
            "block truncate text-[0.78rem] font-semibold tracking-[-0.015em] text-[var(--taskspace-ink)] dark:text-foreground",
            completed && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </strong>
        <small className="mt-0.5 block truncate text-[0.65rem] text-[var(--taskspace-muted)] dark:text-muted-foreground">
          {completed
            ? "Completed"
            : task.subtaskProgress
              ? `${task.subtaskProgress.completed}/${task.subtaskProgress.total} subtasks`
            : task.priority === "p1" && !task.overdue
              ? "High priority"
              : task.scheduledFor
                ? dueLabel
                : "No due date"}
        </small>
      </button>

      <span
        className={cn(
          "inline-flex h-5 items-center rounded-[5px] px-1.5 text-[0.59rem] font-extrabold whitespace-nowrap",
          "hidden md:inline-flex",
          task.priority === "p1" &&
            "bg-[var(--taskspace-coral)]/15 text-[var(--taskspace-coral)]",
          task.priority === "p2" &&
            "bg-[var(--taskspace-canvas)] text-[var(--taskspace-cobalt-deep)]",
          task.priority === "p3" &&
            "bg-[var(--taskspace-periwinkle-pale)] text-[var(--taskspace-cobalt-deep)]",
          task.priority === "p4" &&
            "bg-[var(--taskspace-paper)] text-[var(--taskspace-muted)]",
        )}
      >
        {priorityLabel(task.priority)}
      </span>

      <span className="hidden items-center gap-1 lg:inline-flex">
        {task.labels.slice(0, 2).map((label) => (
          <span
            key={label.id}
            className="inline-flex h-5 max-w-28 items-center overflow-hidden rounded-[var(--taskspace-radius-chip)] bg-[var(--taskspace-periwinkle-pale)] px-1.5 text-[0.59rem] font-extrabold whitespace-nowrap text-[var(--taskspace-cobalt-deep)]"
          >
            <span className="truncate">{label.name}</span>
          </span>
        ))}
      </span>

      {task.scheduledFor ? (
        <span
          className={cn(
            "whitespace-nowrap text-[0.64rem] font-bold text-[var(--taskspace-muted)] dark:text-muted-foreground",
            task.overdue && "text-[var(--taskspace-coral)]",
          )}
        >
          {task.overdue ? `Overdue · ${dueLabel}` : dueLabel}
        </span>
      ) : (
        <span aria-hidden="true" className="w-px" />
      )}

      {task.owner ? (
        <span
          aria-label={`Assigned to ${task.owner.name}`}
          title={task.owner.name}
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-[0.62rem] font-extrabold text-[var(--taskspace-cobalt-deep)]",
            isOwnedByMe ? "bg-[var(--taskspace-citron)]" : "bg-[var(--taskspace-canvas)]",
          )}
        >
          {initials(task.owner.name)}
        </span>
      ) : (
        <span aria-hidden="true" className="w-px" />
      )}

      {onMove ? (
        <span className="hidden flex-col sm:flex" aria-label={`Reorder ${task.title}`}>
          <button
            type="button"
            aria-label={`Move ${task.title} up`}
            disabled={!canMoveUp}
            onClick={() => onMove(task.id, "up")}
            className="flex size-4 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff765d] disabled:opacity-35"
          >
            <ChevronUp className="size-3" />
          </button>
          <button
            type="button"
            aria-label={`Move ${task.title} down`}
            disabled={!canMoveDown}
            onClick={() => onMove(task.id, "down")}
            className="flex size-4 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff765d] disabled:opacity-35"
          >
            <ChevronDown className="size-3" />
          </button>
        </span>
      ) : (
        <span aria-hidden="true" className="hidden sm:block" />
      )}

      {onDelete ? (
        <button
          type="button"
          aria-label={`Delete "${task.title}"`}
          title="Delete task"
          onClick={() => onDelete(task.id)}
          className="flex size-6 items-center justify-center rounded-[var(--taskspace-radius-input)] text-[var(--taskspace-muted)] opacity-0 transition-all hover:bg-[var(--taskspace-coral)]/10 hover:text-[var(--taskspace-coral)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)] group-focus-within:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
    </article>
  );
}
