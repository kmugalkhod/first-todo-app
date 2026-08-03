import "server-only";

import { asc, eq, max } from "drizzle-orm";

import { db, sections } from "@/lib/db";
import { assertPermission, assertProjectAccess } from "./access";
import { NotFoundError, ValidationError } from "./errors";
import { recordActivity } from "./activity";
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

/** Reposition a section within a project (editor/owner). */
export async function reorderSection(
  actor: Actor,
  sectionId: string,
  position: number,
): Promise<SectionDTO> {
  await loadSectionWithPermission(actor, sectionId, "section:write");

  await db
    .update(sections)
    .set({ position: Math.trunc(position) || 0, updatedAt: new Date() })
    .where(eq(sections.id, sectionId));

  const [row] = await db.select().from(sections).where(eq(sections.id, sectionId)).limit(1);
  return toSectionDTO(row);
}

/** Remove a section (editor/owner). Tasks in it are kept but un-sectioned. */
export async function removeSection(
  actor: Actor,
  sectionId: string,
): Promise<void> {
  const section = await loadSectionWithPermission(actor, sectionId, "section:write");

  await db.delete(sections).where(eq(sections.id, sectionId));
  await recordActivity({
    projectId: section.projectId,
    actorId: actor.id,
    action: "section_removed",
    metadata: { name: section.name },
  });
}
