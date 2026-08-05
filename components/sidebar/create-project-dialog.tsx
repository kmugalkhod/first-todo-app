"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createProjectAction } from "@/lib/server-actions/projects";
import type { ProjectDTO } from "@/lib/data-access";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * Project creation dialog (Task 0201 / FR-2).
 *
 * Mirrors the golden-prototype `make-project` dialog: a white, 15px-radius
 * floating card with a display title, a short description, stacked
 * label-above-field inputs and right-aligned Cancel / Create project actions.
 *
 * Captures a required name, an optional description and an invite role that
 * defaults to Editor. On submit it calls the `createProjectAction` server
 * action (the creator becomes the owner, atomically with the membership), then
 * navigates to the new project and refreshes the sidebar so it appears.
 *
 * The invite-role field carries the role the owner will default to when
 * inviting the first people; the actual invitation sending ships with Tasks
 * 0202/0203.
 */
export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (project: ProjectDTO) => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [role, setRole] = React.useState<"Editor" | "Viewer">("Editor");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && !pending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setPending(true);
    setError(null);

    const result = await createProjectAction({
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
    });

    setPending(false);

    if (!result.ok) {
      setError(
        result.error.message ?? "Couldn't create the project. Please try again.",
      );
      return;
    }

    onOpenChange(false);
    setName("");
    setDescription("");
    setRole("Editor");
    toast.success("Project created");
    // Optimistically surface the new project in the sidebar immediately
    // (Task 0201 Recommendation), then reconcile with the server on refresh.
    onCreated?.(result.data);
    // The dedicated project view arrives in Story 04; for now selecting the new
    // project marks it active in the sidebar and refreshes the shared list.
    router.push(`/?project=${result.data.id}`);
    router.refresh();
  }

  const fieldClass =
    "mt-[5px] h-[38px] w-full rounded-[var(--taskspace-radius-control)] border border-[var(--taskspace-line)] bg-white px-[9px] text-[length:var(--taskspace-font-size-body)] text-[var(--taskspace-ink)] outline-none transition-colors placeholder:text-[var(--taskspace-ink-faint)] focus-visible:border-[var(--taskspace-avatar-surface)] focus-visible:ring-3 focus-visible:ring-[var(--taskspace-coral)]/35 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[460px] gap-0 rounded-[var(--taskspace-radius-dialog)] border-0 bg-white p-6 text-[var(--taskspace-ink)] shadow-[0_30px_70px_-38px_#161946b3] sm:max-w-[460px]"
      >
        <DialogTitle className="text-[length:var(--taskspace-font-size-title)] leading-none font-[var(--taskspace-weight-display)] tracking-[var(--taskspace-tracking-title)] text-[var(--taskspace-ink)]">
          Start a shared project.
        </DialogTitle>
        <DialogDescription className="mt-[7px] mb-[18px] text-[length:var(--taskspace-font-size-body)] leading-[1.5] text-[var(--taskspace-muted)]">
          Create the place where your people, sections and commitments will
          live.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <label className="block text-[length:var(--taskspace-font-size-meta)] font-[var(--taskspace-weight-label)] text-[var(--taskspace-ink-soft)]">
            Project name
            <input
              name="project"
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Autumn fundraiser"
              autoFocus
              disabled={pending}
              className={fieldClass}
            />
          </label>

          <label className="mt-3 block text-[length:var(--taskspace-font-size-meta)] font-[var(--taskspace-weight-label)] text-[var(--taskspace-ink-soft)]">
            Description
            <span className="ml-1 font-normal text-[var(--taskspace-ink-faint)]">(optional)</span>
            <textarea
              name="description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this space for?"
              disabled={pending}
              className="mt-[5px] w-full resize-none rounded-[var(--taskspace-radius-control)] border border-[var(--taskspace-line)] bg-white px-[9px] py-2 text-[length:var(--taskspace-font-size-body)] text-[var(--taskspace-ink)] outline-none transition-colors placeholder:text-[var(--taskspace-ink-faint)] focus-visible:border-[var(--taskspace-avatar-surface)] focus-visible:ring-3 focus-visible:ring-[var(--taskspace-coral)]/35 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="mt-3 block text-[length:var(--taskspace-font-size-meta)] font-[var(--taskspace-weight-label)] text-[var(--taskspace-ink-soft)]">
            Invite role
            <select
              name="invite"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as "Editor" | "Viewer")
              }
              disabled={pending}
              className={fieldClass}
            >
              <option value="Editor">Editor</option>
              <option value="Viewer">Viewer</option>
            </select>
          </label>

          {error && (
            <p
              role="alert"
              className="mt-3 text-[length:var(--taskspace-font-size-meta)] font-medium text-[var(--taskspace-coral)]"
            >
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
              {pending ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
