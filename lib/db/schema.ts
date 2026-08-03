import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core/columns";

/**
 * BetterAuth tables (managed by the auth provider, keyed to the Drizzle
 * adapter). We define them explicitly so migrations are versioned rather than
 * relying on BetterAuth's auto-migration. `provider: "pg"` expects snake_case
 * column names by default.
 */
export const authUser = pgTable("auth_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const authSession = pgTable("auth_session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
});

export const authAccount = pgTable("auth_account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const authVerification = pgTable("auth_verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Application user record (PRD FR-1). Keyed by the stable BetterAuth user id
 * (`authProviderId`) so the internal profile survives provider changes. It is
 * created on first authenticated entry and updated on subsequent sign-ins.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  authProviderId: text("auth_provider_id").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/* ------------------------------------------------------------------ */
/*  Enums (shared by the PRD §10 entities)                             */
/* ------------------------------------------------------------------ */

export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "archived",
]);

export const membershipRoleEnum = pgEnum("project_membership_role", [
  "owner",
  "editor",
  "viewer",
]);

export const membershipStatusEnum = pgEnum("project_membership_status", [
  "pending",
  "active",
  "declined",
  "removed",
]);

export const taskPriorityEnum = pgEnum("task_priority", ["p1", "p2", "p3", "p4"]);

export const taskStatusEnum = pgEnum("task_status", ["active", "completed"]);

export const invitationRoleEnum = pgEnum("invitation_role", ["editor", "viewer"]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "declined",
  "expired",
  "revoked",
]);

export const activityActionEnum = pgEnum("activity_action", [
  "project_created",
  "project_archived",
  "project_restored",
  "member_invited",
  "member_accepted",
  "member_declined",
  "member_removed",
  "member_role_changed",
  "task_created",
  "task_updated",
  "task_completed",
  "task_reopened",
  "task_deleted",
  "task_assigned",
  "task_unassigned",
  "comment_added",
  "comment_deleted",
  "section_created",
  "section_renamed",
  "section_reordered",
  "section_removed",
  "label_created",
  "label_renamed",
  "label_deleted",
]);

/* ------------------------------------------------------------------ */
/*  Project + membership                                               */
/* ------------------------------------------------------------------ */

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: projectStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const projectMemberships = pgTable(
  "project_memberships",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull(),
    status: membershipStatusEnum("status").notNull().default("pending"),
    invitedBy: text("invited_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("project_memberships_project_user_unique").on(
      table.projectId,
      table.userId,
    ),
    index("project_memberships_project_idx").on(table.projectId),
    index("project_memberships_user_idx").on(table.userId),
  ],
);

/* ------------------------------------------------------------------ */
/*  Section                                                            */
/* ------------------------------------------------------------------ */

export const sections = pgTable(
  "sections",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sections_project_position_idx").on(table.projectId, table.position),
  ],
);

/* ------------------------------------------------------------------ */
/*  Task (self-referential; project/section/parent scope enforced by   */
/*  triggers added in the migration)                                   */
/* ------------------------------------------------------------------ */

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    // Inbox tasks are private to their creator until moved into a project.
    // Project tasks may leave this null for backwards compatibility with the
    // first migration; every new task records its actor.
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    sectionId: text("section_id").references(() => sections.id, {
      onDelete: "set null",
    }),
    parentTaskId: text("parent_task_id").references((): AnyPgColumn => tasks.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    priority: taskPriorityEnum("priority").notNull().default("p3"),
    assigneeId: text("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    status: taskStatusEnum("status").notNull().default("active"),
    position: integer("position").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: text("completed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("tasks_project_section_idx").on(table.projectId, table.sectionId),
    index("tasks_scheduled_idx").on(table.scheduledFor),
    index("tasks_project_status_position_idx").on(
      table.projectId,
      table.status,
      table.position,
    ),
    index("tasks_project_parent_idx").on(table.projectId, table.parentTaskId),
    index("tasks_inbox_owner_idx").on(table.createdBy, table.projectId),
  ],
);

/* ------------------------------------------------------------------ */
/*  Label + TaskLabel join                                             */
/* ------------------------------------------------------------------ */

export const labels = pgTable(
  "labels",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    colour: text("colour").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("labels_project_name_unique").on(table.projectId, table.name),
  ],
);

export const taskLabels = pgTable(
  "task_labels",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    labelId: text("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("task_labels_pk").on(table.taskId, table.labelId),
  ],
);

/* ------------------------------------------------------------------ */
/*  Comment (soft delete)                                              */
/* ------------------------------------------------------------------ */

export const comments = pgTable(
  "comments",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("comments_task_idx").on(table.taskId)],
);

/* ------------------------------------------------------------------ */
/*  ActivityEvent (append-only audit stream)                           */
/* ------------------------------------------------------------------ */

export const activityEvents = pgTable(
  "activity_events",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    taskId: text("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: activityActionEnum("action").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("activity_events_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/*  Invitation (stores only a token hash, never the raw token)         */
/* ------------------------------------------------------------------ */

export const invitations = pgTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: invitationRoleEnum("role").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    status: invitationStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("invitations_email_idx").on(table.email)],
);

/* ------------------------------------------------------------------ */
/*  Inferred row types                                                 */
/* ------------------------------------------------------------------ */

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type ProjectMembership = typeof projectMemberships.$inferSelect;
export type NewProjectMembership = typeof projectMemberships.$inferInsert;

export type Section = typeof sections.$inferSelect;
export type NewSection = typeof sections.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type Label = typeof labels.$inferSelect;
export type NewLabel = typeof labels.$inferInsert;

export type TaskLabel = typeof taskLabels.$inferSelect;
export type NewTaskLabel = typeof taskLabels.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export type ActivityEvent = typeof activityEvents.$inferSelect;
export type NewActivityEvent = typeof activityEvents.$inferInsert;

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
