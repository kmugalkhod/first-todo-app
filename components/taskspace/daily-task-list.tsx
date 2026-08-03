"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  completeTaskAction,
  createInboxTaskAction,
  moveTaskToProjectAction,
  reopenTaskAction,
} from "@/lib/server-actions/tasks";
import { TaskRow } from "./task-row";
import type { TaskRowData } from "./types";

/** Shared Inbox/Today/Upcoming list; rows keep their familiar complete control. */
export function DailyTaskList({
  title,
  description,
  tasks,
  inbox = false,
  projects = [],
  empty,
}: {
  title: string;
  description: string;
  tasks: TaskRowData[];
  inbox?: boolean;
  projects?: Array<{ id: string; name: string }>;
  empty: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(tasks[0]?.id ?? null);
  const [busy, setBusy] = React.useState(false);
  const [destination, setDestination] = React.useState("");
  const selectedTask = tasks.find((task) => task.id === selected) ?? null;

  async function toggle(id: string, complete: boolean) {
    const result = complete ? await completeTaskAction(id) : await reopenTaskAction(id);
    if (!result.ok) toast.error(result.error.message); else router.refresh();
  }
  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim() || busy) return;
    setBusy(true);
    const result = await createInboxTaskAction({ title: draft });
    setBusy(false);
    if (!result.ok) return toast.error(result.error.message);
    setDraft(""); setSelected(result.data.id); router.refresh();
  }
  async function moveToProject(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedTask || !destination || busy) return;
    setBusy(true);
    const result = await moveTaskToProjectAction(selectedTask.id, destination);
    setBusy(false);
    if (!result.ok) return toast.error(result.error.message ?? "Couldn't move the task.");
    toast.success(`Moved “${selectedTask.title}” into the project.`);
    setDestination(""); setSelected(null); router.refresh();
  }

  return <section className="px-4 py-6 sm:px-8">
    <header className="mb-7"><h1 className="font-heading text-3xl tracking-[-0.04em] text-foreground">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{description}</p></header>
    {inbox && <form onSubmit={add} className="mb-5 flex gap-2 border-b border-border pb-4"><label className="sr-only" htmlFor="inbox-title">New Inbox task</label><input id="inbox-title" value={draft} onChange={(e) => setDraft(e.target.value)} className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)]" placeholder="Capture a task…" /><button disabled={busy} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"><Plus className="size-4" />Add</button></form>}
    {tasks.length ? <div className="border-t border-border">{tasks.map((task) => <TaskRow key={task.id} task={task} selected={task.id === selected} onSelect={setSelected} onToggleComplete={toggle} />)}</div> : <p className="border-y border-dashed border-border py-10 text-sm text-muted-foreground">{empty}</p>}
    {inbox && selectedTask && projects.length > 0 ? <form onSubmit={moveToProject} className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4"><label className="text-sm font-semibold" htmlFor="inbox-destination">Move “{selectedTask.title}” to</label><select id="inbox-destination" value={destination} onChange={(event) => setDestination(event.target.value)} className="min-w-40 rounded-md border border-input bg-background px-2 py-1.5 text-sm"><option value="">Choose a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><button disabled={!destination || busy} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">Move <ArrowRight className="size-4" /></button></form> : null}
  </section>;
}
