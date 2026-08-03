"use client";

import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Tag,
  Trash2,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  formatDueDate,
  initials,
  priorityLabel,
  type TaskRowData,
} from "./types";

/**
 * Task 0301 (wire to Task 0305) — the detail record that sits beside the list.
 *
 * The coexistence rule (DESIGN.md) keeps the task list and selected record
 * side-by-side on wide screens; selecting a row shows its record here without
 * navigating away. This is the structural seed of the fuller Task 0305 detail
 * panel: a distinct pale-periwinkle surface with a thin left divider, a small
 * uppercase project/section kicker, then the title, description and property
 * rows (due, priority, labels, owner).
 */
export function TaskDetailRecord({
  task,
  projectName,
  sectionName,
  meUserId,
  onDelete,
}: {
  task: TaskRowData;
  projectName: string;
  sectionName: string | null;
  meUserId?: string | null;
  /** Deletes the task; renders the destructive delete action when provided. */
  onDelete?: (taskId: string) => void;
}) {
  const completed = task.status === "completed";
  const isOwnedByMe = task.owner?.id != null && task.owner.id === meUserId;
  const dueLabel = formatDueDate(task.scheduledFor);

  return (
    <aside
      aria-label="Task detail"
      className="flex flex-col gap-5 rounded-t-2xl border-l border-border/70 bg-[#eef0ff]/55 p-5 sm:rounded-r-2xl dark:bg-[#eef0ff]/5"
    >
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {projectName}
        {sectionName ? ` / ${sectionName}` : ""}
      </p>

      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 size-4 shrink-0",
            completed
              ? "text-primary"
              : task.overdue
                ? "text-[#bd503b] dark:text-[#ff8a72]"
                : "text-muted-foreground",
          )}
        >
          {completed ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <Circle className="size-4" />
          )}
        </span>
        <h2
          className={cn(
            "font-heading text-xl font-semibold tracking-[-0.02em] text-foreground",
            completed && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </h2>
      </div>

      {task.description ? (
        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {task.description}
        </p>
      ) : (
        <p className="text-sm italic text-muted-foreground/70">
          No description yet.
        </p>
      )}

      <dl className="flex flex-col gap-1.5 text-[0.82rem]">
        {task.scheduledFor ? (
          <div className="flex items-center gap-2.5 text-foreground">
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <dt className="sr-only">Due</dt>
            <dd
              className={cn(
                "font-medium",
                task.overdue && "text-[#bd503b] dark:text-[#ff8a72]",
              )}
            >
              {task.overdue ? `Overdue · ${dueLabel}` : dueLabel}
            </dd>
          </div>
        ) : null}

        <div className="flex items-center gap-2.5">
          <span className="text-[0.68rem] font-bold text-muted-foreground">
            Priority
          </span>
          <dt className="sr-only">Priority</dt>
          <dd className="font-medium">{priorityLabel(task.priority)}</dd>
        </div>

        {task.labels.length > 0 ? (
          <div className="flex items-center gap-2.5">
            <Tag className="size-4 shrink-0 text-muted-foreground" />
            <dt className="sr-only">Labels</dt>
            <dd className="flex flex-wrap gap-1.5">
              {task.labels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex h-5 items-center rounded-[5px] bg-[#e9f7ec] px-1.5 text-[0.62rem] font-bold text-[#37734f] dark:bg-[#1d5d3a]/35 dark:text-[#a9dfc1]"
                >
                  {label.name}
                </span>
              ))}
            </dd>
          </div>
        ) : null}

        {task.owner ? (
          <div className="flex items-center gap-2.5">
            <User className="size-4 shrink-0 text-muted-foreground" />
            <dt className="sr-only">Owner</dt>
            <dd className="flex items-center gap-2 font-medium">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-[0.62rem] font-extrabold text-[#252d95] dark:text-[#1d2350]",
                  isOwnedByMe ? "bg-[#edff81]" : "bg-[#bcc2ee] dark:bg-[#3a428f]",
                )}
              >
                {initials(task.owner.name)}
              </span>
              {task.owner.name}
            </dd>
          </div>
        ) : null}
      </dl>

      {onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="mt-auto inline-flex items-center gap-1.5 justify-self-start rounded-md px-2 py-1 text-[0.7rem] font-bold text-[#bd503b] transition-colors hover:bg-[#ff765d]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff765d] focus-visible:ring-offset-1 dark:text-[#ff8a72]"
        >
          <Trash2 className="size-3.5" />
          Delete task
        </button>
      ) : null}
    </aside>
  );
}
