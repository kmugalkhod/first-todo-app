"use server";

import {
  createLabel,
  deleteLabel,
  updateLabel,
} from "@/lib/data-access";
import type {
  CreateLabelInput,
  LabelDTO,
  UpdateLabelInput,
} from "@/lib/data-access";

import { requireActor, toActionResult } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Label server actions (Task 0103).
 *
 * Labels are project-scoped and editor/owner-gated. Per-project uniqueness is
 * enforced inside the DAO, so a collision surfaces as a recoverable
 * `VALIDATION`/`CONFLICT` result rather than an opaque failure.
 */

/** Create a project label. */
export async function createLabelAction(
  projectId: string,
  input: CreateLabelInput,
): Promise<ActionResult<LabelDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    return createLabel(actor, projectId, input);
  });
}

/** Rename / recolour a project label. */
export async function updateLabelAction(
  labelId: string,
  input: UpdateLabelInput,
): Promise<ActionResult<LabelDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    return updateLabel(actor, labelId, input);
  });
}

/** Delete a project label; task-label joins cascade away. */
export async function deleteLabelAction(
  labelId: string,
): Promise<ActionResult<null>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    await deleteLabel(actor, labelId);
    return null;
  });
}
