/**
 * Data-Access Layer (Task 0102)
 *
 * The single server-side choke point for every read and write on the app's
 * entities. Nothing bypasses it: components and actions must go through these
 * functions, never the ORM directly.
 *
 * Every function takes the authenticated `Actor` as its first argument and
 * enforces membership/role before touching data (PRD §7, §11).
 */
export * from "./types";
export * from "./errors";
export * from "./access";
export * from "./transaction";
export * from "./users";
export * from "./projects";
export * from "./memberships";
export * from "./invitations";
export * from "./sections";
export * from "./tasks";
export * from "./labels";
export * from "./comments";
export * from "./activity";
