"use server";

import {
  createSection,
  removeSection,
  renameSection,
  reorderSection,
} from "@/lib/data-access";
import type {
  CreateSectionInput,
  SectionDTO,
} from "@/lib/data-access";

import { requireActor, toActionResult } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Section server actions (Task 0103).
 *
 * All section writes are editor/owner-gated. The section's owning project is
 * resolved from the database by the DAO, then the actor's membership/role is
 * re-checked server-side — never inferred from anything the client sends.
 */

/** Create a section in a project, appended after existing ones. */
export async function createSectionAction(
  projectId: string,
  input: CreateSectionInput,
): Promise<ActionResult<SectionDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    return createSection(actor, projectId, input);
  });
}

/** Rename a section. */
export async function renameSectionAction(
  sectionId: string,
  name: string,
): Promise<ActionResult<SectionDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    return renameSection(actor, sectionId, name);
  });
}

/** Reposition a section within its project. */
export async function reorderSectionAction(
  sectionId: string,
  position: number,
): Promise<ActionResult<SectionDTO>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    return reorderSection(actor, sectionId, position);
  });
}

/** Remove a section; its tasks are kept but un-sectioned. */
export async function removeSectionAction(
  sectionId: string,
): Promise<ActionResult<null>> {
  return toActionResult(async () => {
    const actor = await requireActor();
    await removeSection(actor, sectionId);
    return null;
  });
}
