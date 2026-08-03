CREATE TYPE "public"."activity_action" AS ENUM('project_created', 'project_archived', 'project_restored', 'member_invited', 'member_accepted', 'member_declined', 'member_removed', 'member_role_changed', 'task_created', 'task_updated', 'task_completed', 'task_reopened', 'task_deleted', 'task_assigned', 'task_unassigned', 'comment_added', 'comment_deleted', 'section_created', 'section_renamed', 'section_removed', 'label_created', 'label_renamed', 'label_deleted');--> statement-breakpoint
CREATE TYPE "public"."invitation_role" AS ENUM('editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'declined', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."project_membership_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."project_membership_status" AS ENUM('pending', 'active', 'declined', 'removed');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('p1', 'p2', 'p3', 'p4');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('active', 'completed');--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"task_id" text,
	"actor_id" text NOT NULL,
	"action" "activity_action" NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "invitation_role" NOT NULL,
	"token_hash" text NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"invited_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"colour" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "project_membership_role" NOT NULL,
	"status" "project_membership_status" DEFAULT 'pending' NOT NULL,
	"invited_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner_id" text NOT NULL,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_labels" (
	"task_id" text NOT NULL,
	"label_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"section_id" text,
	"parent_task_id" text,
	"title" text NOT NULL,
	"description" text,
	"priority" "task_priority" DEFAULT 'p3' NOT NULL,
	"assignee_id" text,
	"scheduled_for" timestamp with time zone,
	"status" "task_status" DEFAULT 'active' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_events_project_created_idx" ON "activity_events" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_task_idx" ON "comments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "labels_project_name_unique" ON "labels" USING btree ("project_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "project_memberships_project_user_unique" ON "project_memberships" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "project_memberships_project_idx" ON "project_memberships" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_memberships_user_idx" ON "project_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sections_project_position_idx" ON "sections" USING btree ("project_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "task_labels_pk" ON "task_labels" USING btree ("task_id","label_id");--> statement-breakpoint
CREATE INDEX "tasks_project_section_idx" ON "tasks" USING btree ("project_id","section_id");--> statement-breakpoint
CREATE INDEX "tasks_scheduled_idx" ON "tasks" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "tasks_project_status_position_idx" ON "tasks" USING btree ("project_id","status","position");--> statement-breakpoint
CREATE INDEX "tasks_project_parent_idx" ON "tasks" USING btree ("project_id","parent_task_id");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Custom integrity rules (appended manually — Drizzle's schema language cannot
-- express cross-table constraints, so they are enforced with triggers):
--   1. A task's section_id and parent_task_id must resolve to the SAME project
--      as its project_id; having a section or parent implies a project.
--   2. task.assignee_id must reference an ACTIVE project member of project_id;
--      Inbox tasks (project_id IS NULL) cannot have an assignee.
--   3. task_labels must join a task and a label from the SAME project.
--   4. A completed task must carry its completed_at timestamp.
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completion_integrity_check" CHECK (
    ("status" = 'completed' AND "completed_at" IS NOT NULL)
    OR ("status" = 'active')
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."enforce_task_project_consistency"()
RETURNS trigger AS $$
BEGIN
    IF NEW."project_id" IS NULL AND (NEW."section_id" IS NOT NULL OR NEW."parent_task_id" IS NOT NULL) THEN
        RAISE EXCEPTION 'tasks with a section or parent task must belong to a project';
    END IF;
    IF NEW."section_id" IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM "sections" s
        WHERE s."id" = NEW."section_id" AND s."project_id" = NEW."project_id"
    ) THEN
        RAISE EXCEPTION 'task.section_id must belong to the same project as task.project_id';
    END IF;
    IF NEW."parent_task_id" IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM "tasks" t
        WHERE t."id" = NEW."parent_task_id" AND t."project_id" = NEW."project_id"
    ) THEN
        RAISE EXCEPTION 'task.parent_task_id must belong to the same project as task.project_id';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "trg_task_project_consistency" ON "tasks";
--> statement-breakpoint
CREATE TRIGGER "trg_task_project_consistency"
BEFORE INSERT OR UPDATE OF "project_id", "section_id", "parent_task_id" ON "tasks"
FOR EACH ROW EXECUTE FUNCTION "public"."enforce_task_project_consistency"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."enforce_task_assignee_active_member"()
RETURNS trigger AS $$
BEGIN
    IF NEW."project_id" IS NULL THEN
        IF NEW."assignee_id" IS NOT NULL THEN
            RAISE EXCEPTION 'inbox tasks (no project) cannot have an assignee';
        END IF;
        RETURN NEW;
    END IF;
    IF NEW."assignee_id" IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM "project_memberships" pm
        WHERE pm."project_id" = NEW."project_id"
          AND pm."user_id" = NEW."assignee_id"
          AND pm."status" = 'active'
    ) THEN
        RAISE EXCEPTION 'task.assignee_id must be an active member of task.project_id';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "trg_task_assignee_active_member" ON "tasks";
--> statement-breakpoint
CREATE TRIGGER "trg_task_assignee_active_member"
BEFORE INSERT OR UPDATE OF "project_id", "assignee_id" ON "tasks"
FOR EACH ROW EXECUTE FUNCTION "public"."enforce_task_assignee_active_member"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."enforce_task_label_project_scope"()
RETURNS trigger AS $$
DECLARE
    task_project_id text;
    label_project_id text;
BEGIN
    SELECT "project_id" INTO task_project_id FROM "tasks" WHERE "id" = NEW."task_id";
    SELECT "project_id" INTO label_project_id FROM "labels" WHERE "id" = NEW."label_id";
    IF task_project_id IS NULL OR task_project_id IS DISTINCT FROM label_project_id THEN
        RAISE EXCEPTION 'task_labels must join a task and a label from the same project';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "trg_task_label_project_scope" ON "task_labels";
--> statement-breakpoint
CREATE TRIGGER "trg_task_label_project_scope"
BEFORE INSERT ON "task_labels"
FOR EACH ROW EXECUTE FUNCTION "public"."enforce_task_label_project_scope"();