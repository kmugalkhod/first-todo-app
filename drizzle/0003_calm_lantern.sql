ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "created_by" text REFERENCES "users"("id") ON DELETE set null;
CREATE INDEX IF NOT EXISTS "tasks_inbox_owner_idx" ON "tasks" USING btree ("created_by", "project_id");

-- Keeps the hierarchy valid even when a write bypasses the application layer.
CREATE OR REPLACE FUNCTION enforce_task_depth() RETURNS trigger AS $$
DECLARE
  cursor_id text;
  depth integer := 1;
BEGIN
  IF NEW.parent_task_id IS NULL THEN RETURN NEW; END IF;
  cursor_id := NEW.parent_task_id;
  WHILE cursor_id IS NOT NULL LOOP
    IF cursor_id = NEW.id THEN
      RAISE EXCEPTION 'task hierarchy cannot contain a cycle';
    END IF;
    depth := depth + 1;
    IF depth > 4 THEN
      RAISE EXCEPTION 'task hierarchy cannot exceed four levels';
    END IF;
    SELECT parent_task_id INTO cursor_id FROM tasks WHERE id = cursor_id;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_task_depth_trigger ON "tasks";
CREATE TRIGGER enforce_task_depth_trigger
BEFORE INSERT OR UPDATE OF parent_task_id ON "tasks"
FOR EACH ROW EXECUTE FUNCTION enforce_task_depth();
