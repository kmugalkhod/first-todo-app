"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PencilLine } from "lucide-react";

import { updateProjectAction } from "@/lib/server-actions/projects";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * Project rename + description editor (Task 0206).
 *
 * Owner-only (enforced server-side inside `updateProject` via the §7 matrix).
 * Captures name + description and calls `updateProjectAction`, then refreshes
 * the layout so the sidebar and any open header converge on the new values.
 *
 * Visual language mirrors the golden-prototype `make-project` dialog / the
 * `create-project-dialog`: a white 15px-radius floating card, label-above-field
 * inputs and right-aligned Cancel / Save actions.
 */
export function ProjectEditDialog({
  open,
  onOpenChange,
  projectId,
  name,
  description,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  name: string;
  description: string | null;
  onSaved?: (name: string, description: string | null) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState(name);
  const [body, setBody] = React.useState(description ?? "");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset the fields whenever the dialog is (re)opened for a project, so it
  // always reflects the server's latest values rather than stale edits. This
  // uses the "adjust state during render" pattern (guarded by `prev`) instead
  // of an effect so it doesn't trigger cascading renders.
  const [prev, setPrev] = React.useState({
    open,
    name,
    description: description ?? "",
  });
  if (
    open &&
    (prev.open !== open ||
      prev.name !== name ||
      prev.description !== (description ?? ""))
  ) {
    setPrev({ open, name, description: description ?? "" });
    setTitle(name);
    setBody(description ?? "");
    setError(null);
  }

  const canSubmit = title.trim().length > 0 && !pending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setPending(true);
    setError(null);

    const result = await updateProjectAction(projectId, {
      name: title.trim(),
      description: body.trim() ? body.trim() : null,
    });

    setPending(false);

    if (!result.ok) {
      setError(
        result.error.message ?? "Couldn't save the project. Please try again.",
      );
      return;
    }

    onOpenChange(false);
    toast.success("Project saved");
    onSaved?.(result.data.name, result.data.description);
    // Reconcile the shared sidebar list and any server-rendered surfaces.
    router.refresh();
  }

  const fieldClass =
    "mt-[5px] h-[38px] w-full rounded-[var(--taskspace-radius-control)] border border-[var(--taskspace-line)] bg-white px-[9px] text-[length:var(--taskspace-font-size-body)] text-[var(--taskspace-ink)] outline-none transition-colors placeholder:text-[var(--taskspace-ink-faint)] focus-visible:border-[var(--taskspace-avatar-surface)] focus-visible:ring-3 focus-visible:ring-[var(--taskspace-coral)]/35 disabled:cursor-not-allowed disabled:opacity-60";
  const areaClass =
    "mt-[5px] min-h-[96px] w-full resize-none rounded-[var(--taskspace-radius-control)] border border-[var(--taskspace-line)] bg-white px-[9px] py-[9px] text-[length:var(--taskspace-font-size-body)] text-[var(--taskspace-ink)] outline-none transition-colors placeholder:text-[var(--taskspace-ink-faint)] focus-visible:border-[var(--taskspace-avatar-surface)] focus-visible:ring-3 focus-visible:ring-[var(--taskspace-coral)]/35 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[460px] gap-0 rounded-[var(--taskspace-radius-dialog)] border-0 bg-white p-6 text-[var(--taskspace-ink)] shadow-[0_30px_70px_-38px_#161946b3] sm:max-w-[460px]"
      >
        <DialogTitle className="flex items-center gap-2 text-[length:var(--taskspace-font-size-title)] leading-none font-[var(--taskspace-weight-display)] tracking-[var(--taskspace-tracking-title)] text-[var(--taskspace-ink)]">
          <PencilLine className="size-5 text-[var(--taskspace-cobalt)]" strokeWidth={2} />
          Edit project.
        </DialogTitle>
        <DialogDescription className="mt-[7px] mb-[18px] text-[length:var(--taskspace-font-size-body)] leading-[1.5] text-[var(--taskspace-muted)]">
          Rename the project or update its description. Only the owner can do
          this.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <label className="block text-[length:var(--taskspace-font-size-meta)] font-[var(--taskspace-weight-label)] text-[var(--taskspace-ink-soft)]">
            Project name
            <input
              name="project"
              required
              maxLength={80}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Autumn fundraiser"
              autoFocus
              disabled={pending}
              className={fieldClass}
            />
          </label>

          <label className="mt-3 block text-[length:var(--taskspace-font-size-meta)] font-[var(--taskspace-weight-label)] text-[var(--taskspace-ink-soft)]">
            Description{body.trim() ? ` (${body.trim().length})` : ""}
            <textarea
              name="description"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="A short note about what this project is for."
              disabled={pending}
              className={areaClass}
            />
          </label>

          {error && (
            <p role="alert" className="mt-3 text-[length:var(--taskspace-font-size-meta)] font-medium text-[var(--taskspace-coral)]">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={pending}
              className="h-[35px] rounded-[var(--taskspace-radius-control)] border border-[var(--taskspace-line)] bg-white px-3 text-[length:var(--taskspace-font-size-meta)] font-[var(--taskspace-weight-label)] text-[var(--taskspace-muted)] transition-colors hover:bg-[var(--taskspace-selected-surface)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="h-[35px] rounded-[var(--taskspace-radius-control)] border-0 bg-[var(--taskspace-cobalt)] px-3 text-[length:var(--taskspace-font-size-meta)] font-[var(--taskspace-weight-label)] text-white transition-colors hover:bg-[var(--taskspace-cobalt-deep)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
