/**
 * Task 0301 — Task List Row + Resources
 *
 * Client-safe data shapes + formatting helpers shared by the task row, the
 * sectioned task list and the record surface. These mirror the domain DTOs
 * (`TaskDTO`, `LabelDTO`, `MemberDTO`) but stay intentionally small: everything
 * here is serialisable over the RSC boundary (dates arrive as ISO strings) and
 * free of any server-only import so it can be used from client components.
 */

export type TaskRowPriority = "p1" | "p2" | "p3" | "p4";
export type TaskRowStatus = "active" | "completed";

export type TaskLabel = { id: string; name: string };

export type TaskOwner = { id: string; name: string } | null;

/** A task as presented in one compact paper row (Task 0301). */
export type TaskRowData = {
  id: string;
  title: string;
  description: string | null;
  status: TaskRowStatus;
  priority: TaskRowPriority;
  labels: TaskLabel[];
  sectionId: string | null;
  /** ISO date string (from the server `Date`), or null when unscheduled. */
  scheduledFor: string | null;
  /** Pre-computed on the server against the server clock (coral attention). */
  overdue: boolean;
  owner: TaskOwner;
};

export type TaskSection = { id: string; name: string };

/**
 * One rendered group in the list: a project section (or the catch-all bucket
 * for tasks the actor did not file into a section).
 */
export type TaskGroup = {
  key: string;
  sectionId: string | null;
  label: string;
  tasks: TaskRowData[];
};

const PRIORITY_LABEL: Record<TaskRowPriority, string> = {
  p1: "P1",
  p2: "P2",
  p3: "P3",
  p4: "P4",
};

export function priorityLabel(priority: TaskRowPriority): string {
  return PRIORITY_LABEL[priority];
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Relative / short due label: Today, Tomorrow, Yesterday, or a compact month-day
 * for anything further out. Falls back to an empty string when unscheduled.
 */
export function formatDueDate(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "";
  const due = startOfDay(new Date(iso));
  const today = startOfDay(now);
  const diffDays = Math.round(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Up to two uppercase initials for an avatar, with a safe fallback. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
