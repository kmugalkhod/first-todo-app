import { describe, expect, it } from "vitest";

import {
  resolveTaskSelection,
  topLevelTaskId,
} from "./task-selection";
import type { TaskGroup, TaskRowData } from "./types";

function task(
  id: string,
  overrides: Partial<TaskRowData> = {},
): TaskRowData {
  return {
    id,
    title: id,
    description: null,
    status: "active",
    priority: "p4",
    labels: [],
    sectionId: "section-1",
    scheduledFor: null,
    overdue: false,
    owner: null,
    ...overrides,
  };
}

describe("task selection", () => {
  const parent = task("parent");
  const child = task("child", { parentTaskId: parent.id });
  const completedGrandchild = task("grandchild", {
    parentTaskId: child.id,
    status: "completed",
  });
  const groups: TaskGroup[] = [
    {
      key: "section-1",
      sectionId: "section-1",
      label: "Launch plan",
      tasks: [parent],
    },
  ];
  const records = [parent, child, completedGrandchild];

  it("opens nested child records without adding them to the top-level list", () => {
    expect(
      resolveTaskSelection(groups, records, child.id),
    ).toMatchObject({
      task: { id: child.id },
      sectionName: "Launch plan",
      group: { key: "section-1" },
    });
  });

  it("keeps completed children selectable when completed parents are hidden", () => {
    expect(
      resolveTaskSelection(groups, records, completedGrandchild.id)?.task
        .id,
    ).toBe(completedGrandchild.id);
  });

  it("keeps the root list row highlighted for nested selections", () => {
    expect(topLevelTaskId(records, completedGrandchild.id)).toBe(parent.id);
  });

  it("keeps a just-completed top-level task open for local confirmation", () => {
    const completedParent = task("completed-parent", { status: "completed" });
    expect(
      resolveTaskSelection(
        [{ ...groups[0], tasks: [completedParent] }],
        [completedParent],
        completedParent.id,
      )?.task.id,
    ).toBe(completedParent.id);
  });
});
