"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  formatDueDate,
  initials,
  priorityPillClass,
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
}: {
  task: TaskRowData;
  selected: boolean;
  /** Used to raise the citron ownership marker for the current user's tasks. */
  meUserId?: string | null;
  onSelect: (taskId: string) => void;
  onToggleComplete: (taskId: string, complete: boolean) => void;
}) {
  const completed = task.status === "completed";
  const dueLabel = formatDueDate(task.scheduledFor);
  const isOwnedByMe = task.owner?.id != null && task.owner.id === meUserId;

  // Mirrors the reference workboard exactly: completion, task copy, priority,
  // label, planned date, then one 23px owner mark. No utility controls take up
  // grid columns in the scan line.
  const surface =
    "grid min-h-[58px] grid-cols-[21px_minmax(120px,1fr)_auto_auto_auto_23px] items-center gap-[var(--taskspace-space-compact)] border-b border-border max-[620px]:min-h-[62px] max-[620px]:grid-cols-[20px_minmax(0,1fr)_auto_23px] max-[620px]:gap-[var(--taskspace-space-control)]";

  return (
    <article
      className={cn(
        surface,
        "transition-[background-color,transform] [transition-duration:var(--taskspace-motion-fast)] [transition-timing-function:var(--taskspace-ease-out)] hover:bg-[var(--taskspace-periwinkle-pale)]/65 motion-reduce:transition-none",
        selected && "-mx-[var(--taskspace-radius-panel)] rounded-[var(--taskspace-radius-panel)] border-b-transparent bg-[var(--taskspace-periwinkle-pale)] px-[var(--taskspace-radius-panel)]",
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
          "flex size-[19px] shrink-0 items-center justify-center rounded-full border-2 border-[color-mix(in_srgb,var(--taskspace-muted)_55%,var(--taskspace-paper))] bg-transparent transition-[background-color,border-color,transform] duration-150 hover:border-primary active:scale-90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--taskspace-coral)] focus-visible:ring-offset-2 motion-reduce:transition-none",
          completed && "border-primary bg-primary text-primary-foreground",
        )}
      >
        {completed ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </button>

      <button
        type="button"
        onClick={() => onSelect(task.id)}
        className="min-w-0 rounded-[var(--taskspace-radius-input)] text-left transition-transform duration-150 active:translate-x-px focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--taskspace-coral)] focus-visible:ring-offset-2 motion-reduce:transition-none"
      >
        <strong
          className={cn(
            "block truncate text-[length:var(--taskspace-font-size-body)] font-semibold tracking-[-0.015em] text-[var(--taskspace-ink)] dark:text-foreground",
            completed && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </strong>
        <small className="mt-1 block truncate text-[length:var(--taskspace-font-size-meta)] text-[var(--taskspace-muted)] dark:text-muted-foreground">
          {completed
            ? "Completed"
            : task.subtaskProgress
              ? `${task.subtaskProgress.completed}/${task.subtaskProgress.total} subtasks`
            : task.description
              ? task.description
            : task.priority === "p1" && !task.overdue
              ? "High priority"
              : task.scheduledFor
                ? "Scheduled work"
                : "No due date"}
        </small>
      </button>

      <span
        className={cn(
          "inline-flex h-5 items-center rounded-[var(--taskspace-radius-chip)] px-1.5 text-[length:var(--taskspace-font-size-chip)] font-extrabold whitespace-nowrap",
          "hidden md:inline-flex",
          priorityPillClass(task.priority),
        )}
      >
        {priorityLabel(task.priority)}
      </span>

      <span className="hidden items-center gap-1 lg:inline-flex">
        {task.labels.slice(0, 2).map((label) => (
          <span
            key={label.id}
            className="inline-flex h-5 max-w-28 items-center overflow-hidden rounded-[var(--taskspace-radius-chip)] bg-[var(--taskspace-periwinkle-pale)] px-1.5 text-[length:var(--taskspace-font-size-chip)] font-extrabold whitespace-nowrap text-[var(--taskspace-cobalt-deep)]"
          >
            <span className="truncate">{label.name}</span>
          </span>
        ))}
      </span>

      {task.scheduledFor ? (
        <span
          className={cn(
            "whitespace-nowrap text-[length:var(--taskspace-font-size-meta)] font-bold text-[var(--taskspace-muted)] dark:text-muted-foreground max-[620px]:max-w-[var(--taskspace-mobile-due-width)] max-[620px]:overflow-hidden max-[620px]:text-ellipsis",
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
            "flex size-[23px] items-center justify-center rounded-full text-[length:var(--taskspace-font-size-micro)] font-extrabold text-[var(--taskspace-cobalt-deep)]",
            isOwnedByMe ? "bg-[var(--taskspace-citron)]" : "bg-[var(--taskspace-canvas)]",
          )}
        >
          {initials(task.owner.name)}
        </span>
      ) : (
        <span aria-hidden="true" className="w-px" />
      )}

    </article>
  );
}
