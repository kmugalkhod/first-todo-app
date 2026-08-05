import type { TaskGroup, TaskRowData } from "./types";

export type TaskSelection = {
  task: TaskRowData;
  sectionName: string | null;
  group: TaskGroup | null;
};

/**
 * Resolve a selected record without promoting child tasks into the workboard.
 * A task completed from its open record stays selected so the user sees local
 * confirmation even when completed rows are hidden from the list. Completed
 * children remain reachable from their parent's subtask list as before.
 */
export function resolveTaskSelection(
  groups: TaskGroup[],
  taskRecords: TaskRowData[],
  selectedId: string | null,
): TaskSelection | null {
  if (!selectedId) return null;

  for (const group of groups) {
    const task = group.tasks.find((candidate) => candidate.id === selectedId);
    if (task) {
      return { task, sectionName: group.label, group };
    }
  }

  const task = taskRecords.find((candidate) => candidate.id === selectedId);
  if (!task) {
    return null;
  }

  const group =
    groups.find((candidate) => candidate.sectionId === task.sectionId) ?? null;

  return {
    task,
    sectionName: group?.label ?? null,
    group,
  };
}

/** Keep the originating top-level row highlighted while a descendant is open. */
export function topLevelTaskId(
  taskRecords: TaskRowData[],
  selectedId: string | null,
): string | null {
  if (!selectedId) return null;

  const recordsById = new Map(
    taskRecords.map((task) => [task.id, task] as const),
  );
  const visited = new Set<string>();
  let currentId = selectedId;

  while (!visited.has(currentId)) {
    visited.add(currentId);
    const task = recordsById.get(currentId);
    if (!task?.parentTaskId) return currentId;
    currentId = task.parentTaskId;
  }

  return selectedId;
}
