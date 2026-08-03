"use client";

import { Check } from "lucide-react";

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

  const surface =
    "min-h-[58px] grid grid-cols-[21px_minmax(0,1fr)_auto_auto_auto_23px] items-center gap-3 border-b border-[#ebedf4]";

  return (
    <article
      className={cn(
        surface,
        "transition-colors hover:bg-[#f7f8ff]",
        selected && "rounded-[10px] border-b-transparent bg-[#f7f8ff]",
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
          "flex size-[19px] shrink-0 items-center justify-center rounded-full border-2 border-[#aab0c4] bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#ff765d] focus-visible:ring-offset-2 hover:border-primary",
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
            "block truncate text-[0.78rem] font-semibold tracking-[-0.015em] text-[#202550] dark:text-foreground",
            completed && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </strong>
        <small className="mt-0.5 block truncate text-[0.65rem] text-[#8990a7] dark:text-muted-foreground">
          {completed
            ? "Completed"
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
            "bg-[#fff0ed] text-[#b74c3a] dark:bg-[#7c251c]/40 dark:text-[#ffb5a6]",
          task.priority === "p2" &&
            "bg-[#fff6d8] text-[#90701c] dark:bg-[#76540b]/35 dark:text-[#f9d98a]",
          task.priority === "p3" &&
            "bg-[#eef0ff] text-[#5963ae] dark:bg-[#3a428f]/35 dark:text-[#c3c9ff]",
          task.priority === "p4" &&
            "bg-[#eff2f4] text-[#6e7887] dark:bg-[#333a46]/40 dark:text-[#c7cdd6]",
        )}
      >
        {priorityLabel(task.priority)}
      </span>

      <span className="hidden items-center gap-1 lg:inline-flex">
        {task.labels.slice(0, 2).map((label) => (
          <span
            key={label.id}
            className="inline-flex h-5 max-w-28 items-center overflow-hidden rounded-[5px] bg-[#e9f7ec] px-1.5 text-[0.59rem] font-extrabold whitespace-nowrap text-[#37734f] dark:bg-[#1d5d3a]/35 dark:text-[#a9dfc1]"
          >
            <span className="truncate">{label.name}</span>
          </span>
        ))}
      </span>

      {task.scheduledFor ? (
        <span
          className={cn(
            "whitespace-nowrap text-[0.64rem] font-bold text-[#67718e] dark:text-muted-foreground",
            task.overdue && "text-[#bd503b] dark:text-[#ff8a72]",
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
            "flex size-6 items-center justify-center rounded-full text-[0.62rem] font-extrabold text-[#252d95] dark:text-[#1d2350]",
            isOwnedByMe ? "bg-[#edff81]" : "bg-[#bcc2ee] dark:bg-[#3a428f]",
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
