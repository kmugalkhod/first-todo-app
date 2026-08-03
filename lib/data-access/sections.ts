import "server-only";

import { and, asc, eq, inArray, max } from "drizzle-orm";

import { db, sections, tasks } from "@/lib/db";
import { assertPermission, assertProjectAccess } from "./access";
import { NotFoundError, ValidationError } from "./errors";
import { recordActivity, recordActivityInTx } from "./activity";
import { transaction } from "./transaction";
import type { Actor } from "./types";

export type SectionDTO = {
  id: string;
  projectId: string;
  name: string;
  position: number;
};

function toSectionDTO(row: typeof sections.$inferSelect): SectionDTO {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    position: row.position,
  };
}

/** Load a section and assert the actor holds `permission` on its project. */
async function loadSectionWithPermission(
  actor: Actor,
  sectionId: string,
  permission: Parameters<typeof assertPermission>[2],
) {
  const [section] = await db
    .select()
    .from(sections)
    .where(eq(sections.id, sectionId))
    .limit(1);
  if (!section) throw new NotFoundError("Section not found.");
  await assertPermission(actor, section.projectId, permission);
  return section;
}

/**
 * List a project's sections in display order (project:view).
 */
export async function listSections(
  actor: Actor,
  projectId: string,
): Promise<SectionDTO[]> {
  await assertProjectAccess(actor, projectId);
  const rows = await db
    .select()
    .from(sections)
    .where(eq(sections.projectId, projectId))
    .orderBy(asc(sections.position));
  return rows.map(toSectionDTO);
}

export type CreateSectionInput = {
  name: string;
};

/** Create a section, appended after the current ones (editor/owner). */
export async function createSection(
  actor: Actor,
  projectId: string,
  input: CreateSectionInput,
): Promise<SectionDTO> {
  await assertPermission(actor, projectId, "section:write");

  const name = input.name?.trim();
  if (!name) throw new ValidationError("Section name is required.");

  const [{ maxPos }] = await db
    .select({ maxPos: max(sections.position) })
    .from(sections)
    .where(eq(sections.projectId, projectId));

  const position = Number(maxPos ?? -1) + 1;
  const id = crypto.randomUUID();

  await db.insert(sections).values({ id, projectId, name, position });
  await recordActivity({
    projectId,
    actorId: actor.id,
    action: "section_created",
    metadata: { name },
  });

  const [row] = await db.select().from(sections).where(eq(sections.id, id)).limit(1);
  return toSectionDTO(row);
}

/** Rename a section (editor/owner). */
export async function renameSection(
  actor: Actor,
  sectionId: string,
  name: string,
): Promise<SectionDTO> {
  const section = await loadSectionWithPermission(actor, sectionId, "section:write");
  const trimmed = name?.trim();
  if (!trimmed) throw new ValidationError("Section name is required.");

  await db
    .update(sections)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(eq(sections.id, sectionId));
  await recordActivity({
    projectId: section.projectId,
    actorId: actor.id,
    action: "section_renamed",
    metadata: { name: trimmed },
  });

  const [row] = await db.select().from(sections).where(eq(sections.id, sectionId)).limit(1);
  return toSectionDTO(row);
}

/**
 * Reorder a project's sections (editor/owner) so display order matches
 * `orderedIds`. Runs in a single transaction and rewrites every affected section
 * to a dense 0..n-1 `position`, so ordering stays consistent (FR-5). All ids
 * must belong to the same project (enforced by the project access check, which
 * doubles as the same-project guarantee). On success records a single
 * `section_reordered` activity event so the change stays attributable.
 */
export async function reorderSections(
  actor: Actor,
  projectId: string,
  orderedIds: string[],
): Promise<void> {
  await assertPermission(actor, projectId, "section:write");

  const uniqueIds = [...new Set(orderedIds)];
  if (uniqueIds.length === 0) {
    throw new ValidationError("At least one section must be provided.");
  }

  // Only sections that belong to `projectId` — anything else is rejected so a
  // caller can never shuffle sections from another project (step 4).
  const owned = await db
    .select({ id: sections.id })
    .from(sections)
    .where(and(eq(sections.projectId, projectId), inArray(sections.id, uniqueIds)));
  const ownedIds = new Set(owned.map((s) => s.id));

  const missing = uniqueIds.filter((id) => !ownedIds.has(id));
  if (missing.length > 0) {
    throw new NotFoundError("One or more sections do not exist in this project.");
  }

  await transaction(async (tx) => {
    for (let i = 0; i < uniqueIds.length; i += 1) {
      await tx
        .update(sections)
        .set({ position: i, updatedAt: new Date() })
        .where(eq(sections.id, uniqueIds[i]));
    }
    await recordActivityInTx(tx, {
      projectId,
      actorId: actor.id,
      action: "section_reordered",
      metadata: { order: uniqueIds },
    });
  });
}

/**
 * Remove a section (editor/owner).
 *
 * Remove policy (documented for FR-5): a removed section's tasks are **not**
 * deleted — they are released back to the project's catch-all "No section"
 * bucket (`task.section_id -> NULL`). This guarantees no orphaned tasks and is
 * applied in the same transaction as the delete, so the two claims always commit
 * together. The DB-level `ON DELETE SET NULL` foreign key is a second line of
 * defence against orphans.
 */
export async function removeSection(
  actor: Actor,
  sectionId: string,
): Promise<void> {
  const section = await loadSectionWithPermission(actor, sectionId, "section:write");

  await transaction(async (tx) => {
    await tx
      .update(tasks)
      .set({ sectionId: null, updatedAt: new Date() })
      .where(eq(tasks.sectionId, section.id));
    await tx.delete(sections).where(eq(sections.id, section.id));
    await recordActivityInTx(tx, {
      projectId: section.projectId,
      actorId: actor.id,
      action: "section_removed",
      metadata: {
        name: section.name,
        movedTasksTo: null,
      },
    });
  });
}
