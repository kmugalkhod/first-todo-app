"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createProjectAction } from "@/lib/server-actions/projects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

/**
 * Project creation dialog (Task 0201 / FR-2).
 *
 * Captures a required name, an optional description and an invite role that
 * defaults to Editor. On submit it calls the `createProjectAction` server
 * action (the creator becomes the owner, atomically with the membership), then
 * navigates to the new project and refreshes the sidebar so it appears.
 *
 * The invite-role field mirrors the prototype's creation dialog and carries the
 * role the owner will default to when inviting the first people; the actual
 * invitation sending ships with Tasks 0202/0203.
 */
export function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
    // The dedicated project view arrives in Story 04; for now selecting the new
    // project marks it active in the sidebar and refreshes the shared list.
    router.push(`/?project=${result.data.id}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a shared project.</DialogTitle>
          <DialogDescription>
            Create the place where your people, sections and commitments will
            live.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="grid gap-1.5">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              name="project"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="e.g. Autumn fundraiser"
              autoFocus
              disabled={pending}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="project-description">
              Description{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="project-description"
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="What is this space for?"
              disabled={pending}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="invite-role">Invite role</Label>
            <p className="text-xs leading-5 text-muted-foreground">
              The default role your first invited teammates get.
            </p>
            <NativeSelect
              id="invite-role"
              name="invite"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as "Editor" | "Viewer")
              }
              disabled={pending}
              className="w-full"
            >
              <NativeSelectOption value="Editor">Editor</NativeSelectOption>
              <NativeSelectOption value="Viewer">Viewer</NativeSelectOption>
            </NativeSelect>
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {pending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
