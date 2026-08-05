import { describe, expect, it } from "vitest";

import {
  appendSavedSubtask,
  isPendingSubtask,
  visibleSubtasks,
  type PendingSubtask,
  type SubtaskData,
} from "./task-subtasks";

const first: SubtaskData = {
  id: "subtask-1",
  title: "First child",
  status: "active",
};

describe("visibleSubtasks", () => {
  it("shows a pending child while the server snapshot is unchanged", () => {
    const pending: PendingSubtask = {
      id: "__pending_subtask_2",
      title: "Second child",
      status: "active",
      serverIdsAtSubmit: [first.id],
    };

    expect(visibleSubtasks([first], [pending])).toEqual([first, pending]);
  });

  it("does not duplicate a second child when the refreshed server snapshot arrives first", () => {
    const savedSecond: SubtaskData = {
      id: "subtask-2",
      title: "Second child",
      status: "active",
    };
    const pending: PendingSubtask = {
      id: "__pending_subtask_2",
      title: savedSecond.title,
      status: "active",
      serverIdsAtSubmit: [first.id],
    };

    expect(visibleSubtasks([first, savedSecond], [pending])).toEqual([
      first,
      savedSecond,
    ]);
  });
});

describe("isPendingSubtask", () => {
  it("only identifies optimistic child ids", () => {
    expect(
      isPendingSubtask({
        id: "__pending_subtask_3",
        title: "Third child",
        status: "active",
      }),
    ).toBe(true);
    expect(isPendingSubtask(first)).toBe(false);
  });
});

describe("appendSavedSubtask", () => {
  it("keeps a saved child unique when local and server updates reconcile", () => {
    const savedSecond: SubtaskData = {
      id: "subtask-2",
      title: "Second child",
      status: "active",
    };

    expect(appendSavedSubtask([first, savedSecond], savedSecond)).toEqual([
      first,
      savedSecond,
    ]);
  });
});
