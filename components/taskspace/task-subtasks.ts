import type { TaskRowData } from "./types";

export type SubtaskData = NonNullable<TaskRowData["subtasks"]>[number];

export type PendingSubtask = SubtaskData & {
  /** Server children that existed before this optimistic create started. */
  serverIdsAtSubmit?: readonly string[];
};

export function isPendingSubtask(subtask: SubtaskData): boolean {
  return subtask.id.startsWith("__pending_subtask_");
}

/**
 * Merge the server snapshot with pending creates without flashing the same
 * subtask twice when a Server Action refresh arrives before its promise
 * continuation resolves on the client.
 */
export function visibleSubtasks(
  serverSubtasks: readonly SubtaskData[],
  pendingSubtasks: readonly PendingSubtask[],
): SubtaskData[] {
  const serverIds = new Set(serverSubtasks.map((subtask) => subtask.id));

  return [
    ...serverSubtasks,
    ...pendingSubtasks.filter((pending) => {
      if (serverIds.has(pending.id)) return false;

      const baselineIds = new Set(pending.serverIdsAtSubmit ?? []);
      const serverAlreadyResolvedPending = serverSubtasks.some(
        (subtask) =>
          !baselineIds.has(subtask.id) && subtask.title === pending.title,
      );

      return !serverAlreadyResolvedPending;
    }),
  ];
}

/** Add the saved child to a parent snapshot exactly once. */
export function appendSavedSubtask(
  subtasks: readonly SubtaskData[],
  savedSubtask: SubtaskData,
): SubtaskData[] {
  const existingIndex = subtasks.findIndex(
    (subtask) => subtask.id === savedSubtask.id,
  );
  if (existingIndex === -1) return [...subtasks, savedSubtask];

  return subtasks.map((subtask, index) =>
    index === existingIndex ? savedSubtask : subtask,
  );
}
