"use client";

import {
  CalendarDays,
  CheckCircle2,
  Circle,
  PencilLine,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { addCommentAction, deleteCommentAction } from "@/lib/server-actions/comments";
import { createLabelAction, deleteLabelAction, updateLabelAction } from "@/lib/server-actions/labels";
import { assignTaskAction, completeTaskAction, createTaskAction, reopenTaskAction, setTaskLabelsAction, updateTaskAction } from "@/lib/server-actions/tasks";
import { TASKSPACE_LABEL_COLOUR } from "@/lib/taskspace-tokens";

import { cn } from "@/lib/utils";
import {
  formatDueDate,
  initials,
  priorityLabel,
  type TaskRowData,
} from "./types";

/**
 * Task 0301 (wire to Task 0305) — the detail record that sits beside the list.
 *
 * The coexistence rule (DESIGN.md) keeps the task list and selected record
 * side-by-side on wide screens; selecting a row shows its record here without
 * navigating away. This is the structural seed of the fuller Task 0305 detail
 * panel: a distinct pale-periwinkle surface with a thin left divider, a small
 * uppercase project/section kicker, then the title, description and property
 * rows (due, priority, labels, owner).
 */
function linkify(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, index) => /^https?:\/\//.test(part) ? <a key={index} href={part} target="_blank" rel="noreferrer" className="text-primary underline">{part}</a> : part);
}

function Property({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[25px] grid-cols-[84px_minmax(0,1fr)] items-center gap-2 text-xs">
      <dt className="flex items-center gap-1.5 text-[var(--taskspace-muted)]">
        {icon}
        {label}
      </dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-1.5 font-bold text-[var(--taskspace-ink)]">
        {children}
      </dd>
    </div>
  );
}

export function TaskDetailRecord({
  task,
  projectName,
  projectId,
  sectionName,
  meUserId,
  onDelete,
  canEdit = false,
  members = [],
  availableLabels = [],
  canModerateComments = false,
}: {
  task: TaskRowData;
  projectName: string;
  projectId: string;
  sectionName: string | null;
  meUserId?: string | null;
  /** Deletes the task; renders the destructive delete action when provided. */
  onDelete?: (taskId: string) => void;
  canEdit?: boolean;
  members?: Array<{ id: string; name: string }>;
  availableLabels?: Array<{ id: string; name: string }>;
  canModerateComments?: boolean;
}) {
  const router = useRouter();
  const [comment, setComment] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [labelName, setLabelName] = React.useState("");
  const [subtaskTitle, setSubtaskTitle] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const [managingLabels, setManagingLabels] = React.useState(false);
  const completed = task.status === "completed";
  const isOwnedByMe = task.owner?.id != null && task.owner.id === meUserId;
  const dueLabel = formatDueDate(task.scheduledFor);

  async function update(input: Parameters<typeof updateTaskAction>[1]) {
    setSaving(true); const result = await updateTaskAction(task.id, input); setSaving(false);
    if (!result.ok) toast.error(result.error.message); else router.refresh();
  }
  async function submitComment(event: React.FormEvent) {
    event.preventDefault(); if (!comment.trim()) return;
    setSaving(true); const result = await addCommentAction(task.id, { body: comment }); setSaving(false);
    if (!result.ok) return toast.error(result.error.message); setComment(""); router.refresh();
  }
  async function createLabel(event: React.FormEvent) {
    event.preventDefault();
    if (!labelName.trim()) return;
    const result = await createLabelAction(projectId, { name: labelName, colour: TASKSPACE_LABEL_COLOUR });
    if (!result.ok) return toast.error(result.error.message);
    setLabelName(""); router.refresh();
  }
  async function addSubtask(event: React.FormEvent) {
    event.preventDefault();
    const title = subtaskTitle.trim();
    if (!title) return;
    setSaving(true);
    const result = await createTaskAction(projectId, {
      title,
      sectionId: task.sectionId,
      parentTaskId: task.id,
    });
    setSaving(false);
    if (!result.ok) return toast.error(result.error.message);
    setSubtaskTitle("");
    router.refresh();
  }

  return (
    <aside
      aria-label="Task detail"
      className="flex min-h-full flex-col gap-[19px] border-l border-border bg-[var(--taskspace-periwinkle-pale)] p-[22px] dark:bg-[var(--taskspace-periwinkle-pale)]/15"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--taskspace-cobalt)]">
        {projectName}
        {sectionName ? ` / ${sectionName}` : ""}
      </p>

      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 size-4 shrink-0",
            completed
              ? "text-primary"
              : task.overdue
                ? "text-[var(--taskspace-coral)]"
                : "text-muted-foreground",
          )}
        >
          {completed ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <Circle className="size-4" />
          )}
        </span>
        <h2
          className={cn(
            "font-heading text-[1.45rem] font-semibold tracking-[-0.04em] text-foreground",
            completed && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </h2>
        </div>
        {canEdit ? (
          <button
            type="button"
            aria-pressed={editing}
            onClick={() => setEditing((value) => !value)}
            className="flex size-7 shrink-0 items-center justify-center rounded-[var(--taskspace-radius-control)] text-muted-foreground transition-colors hover:bg-[var(--taskspace-periwinkle-pale)] hover:text-[var(--taskspace-cobalt-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)] focus-visible:ring-offset-2"
            aria-label={editing ? "Close task editor" : "Edit task"}
          >
            <PencilLine className="size-3.5" />
          </button>
        ) : null}
      </div>

      {task.description ? (
        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {task.description}
        </p>
      ) : (
        <p className="text-sm italic text-muted-foreground/70">
          No description yet.
        </p>
      )}

      <dl className="grid gap-2 border-y border-border py-[14px] text-xs">
        <Property label="Assignee" icon={<User className="size-3.5" />}>
          {task.owner ? <><span className={cn("flex size-[21px] items-center justify-center rounded-full text-[0.59rem] font-extrabold text-[var(--taskspace-cobalt-deep)]", isOwnedByMe ? "bg-[var(--taskspace-citron)]" : "bg-[var(--taskspace-periwinkle-pale)]")}>{initials(task.owner.name)}</span>{task.owner.name}</> : "Unassigned"}
        </Property>
        <Property label="Planned" icon={<CalendarDays className="size-3.5" />}>
          <span className={cn(task.overdue && "text-[var(--taskspace-coral)]")}>{task.scheduledFor ? (task.overdue ? `Overdue · ${dueLabel}` : dueLabel) : "No date"}</span>
        </Property>
        <Property label="Priority">
          <span className="inline-flex h-5 items-center rounded-[var(--taskspace-radius-chip)] bg-[var(--taskspace-periwinkle-pale)] px-1.5 text-[0.62rem] font-extrabold text-[var(--taskspace-cobalt-deep)]">{priorityLabel(task.priority)}</span>
        </Property>
        <Property label="Labels" icon={<Tag className="size-3.5" />}>
          {task.labels.length ? task.labels.map((label) => <span key={label.id} className="inline-flex h-5 items-center rounded-[var(--taskspace-radius-chip)] bg-[var(--taskspace-paper)] px-1.5 text-[0.62rem] font-extrabold text-[var(--taskspace-cobalt-deep)]">{label.name}</span>) : "No labels"}
        </Property>
      </dl>

      {canEdit && editing ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void update({ title: String(data.get("title")), description: String(data.get("description")) || null, priority: String(data.get("priority")) as TaskRowData["priority"], scheduledFor: data.get("scheduledFor") ? new Date(String(data.get("scheduledFor"))) : null }); }} className="grid gap-2 border-b border-border pb-[14px]"><label className="text-xs font-bold text-[var(--taskspace-muted)]" htmlFor={`title-${task.id}`}>Edit task</label><input id={`title-${task.id}`} name="title" defaultValue={task.title} className="h-[34px] rounded-[var(--taskspace-radius-input)] border border-input bg-background px-2 text-[0.72rem]" /><textarea name="description" defaultValue={task.description ?? ""} className="min-h-20 rounded-[var(--taskspace-radius-input)] border border-input bg-background px-2 py-2 text-[0.72rem]" /><div className="grid grid-cols-2 gap-2"><select name="priority" defaultValue={task.priority} className="h-[34px] rounded-[var(--taskspace-radius-input)] border border-input bg-background px-2 text-[0.72rem]"><option value="p1">P1</option><option value="p2">P2</option><option value="p3">P3</option><option value="p4">P4</option></select><input name="scheduledFor" type="date" defaultValue={task.scheduledFor?.slice(0, 10) ?? ""} className="h-[34px] rounded-[var(--taskspace-radius-input)] border border-input bg-background px-2 text-[0.72rem]" /></div><button disabled={saving} className="h-[34px] justify-self-start rounded-[var(--taskspace-radius-input)] bg-primary px-3 text-xs font-bold text-primary-foreground">Save changes</button></form> : null}

      {canEdit && editing ? <div className="border-b border-border pb-[14px]"><button type="button" aria-expanded={managingLabels} onClick={() => setManagingLabels((value) => !value)} className="text-xs font-bold text-[var(--taskspace-cobalt)] hover:text-[var(--taskspace-cobalt-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)]">{managingLabels ? "Close task properties" : "Edit assignee and labels"}</button>{managingLabels ? <div className="mt-2 grid gap-2"><select id={`assignee-${task.id}`} value={task.owner?.id ?? ""} onChange={(event) => void assignTaskAction(task.id, event.target.value || null).then((result) => { if (!result.ok) toast.error(result.error.message); else router.refresh(); })} className="h-[34px] rounded-[var(--taskspace-radius-input)] border border-input bg-background px-2 text-[0.72rem]"><option value="">No assignee</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><fieldset><legend className="text-xs font-bold text-[var(--taskspace-muted)]">Labels</legend><div className="mt-1 flex flex-wrap gap-2">{availableLabels.map((label) => <span key={label.id} className="inline-flex items-center gap-1 text-xs"><input type="checkbox" aria-label={`Apply ${label.name}`} checked={task.labels.some((item) => item.id === label.id)} onChange={(event) => { const next = event.currentTarget.checked ? [...task.labels.map((item) => item.id), label.id] : task.labels.filter((item) => item.id !== label.id).map((item) => item.id); void setTaskLabelsAction(task.id, next).then((result) => { if (!result.ok) toast.error(result.error.message); else router.refresh(); }); }} /><button type="button" className="underline" onClick={() => { const name = window.prompt("Rename label", label.name); if (name?.trim()) void updateLabelAction(label.id, { name }).then((result) => { if (!result.ok) toast.error(result.error.message); else router.refresh(); }); }}>{label.name}</button><button type="button" aria-label={`Delete label ${label.name}`} className="text-muted-foreground" onClick={() => void deleteLabelAction(label.id).then((result) => { if (!result.ok) toast.error(result.error.message); else router.refresh(); })}>×</button></span>)}</div><form onSubmit={createLabel} className="mt-2 flex gap-2"><label className="sr-only" htmlFor={`label-${task.id}`}>New label</label><input id={`label-${task.id}`} value={labelName} onChange={(event) => setLabelName(event.target.value)} className="h-[34px] min-w-0 flex-1 rounded-[var(--taskspace-radius-input)] border border-input bg-background px-2 text-[0.72rem]" placeholder="New label" /><button className="h-[34px] rounded-[var(--taskspace-radius-input)] bg-primary px-3 text-xs font-bold text-primary-foreground">Create</button></form></fieldset></div> : null}</div> : null}

      <section className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Subtasks</h3>
        {task.subtaskProgress ? <p className="mt-1 text-xs text-muted-foreground">{task.subtaskProgress.completed} of {task.subtaskProgress.total} complete. Unfinished child work stays open when its parent is completed.</p> : <p className="mt-1 text-xs text-muted-foreground">Break this task into smaller, independently completable work.</p>}
        {task.subtasks?.length ? <ul className="mt-3 space-y-1.5" aria-label="Subtasks">{task.subtasks.map((subtask) => {
          const isComplete = subtask.status === "completed";
          return <li key={subtask.id} className="flex items-center gap-2 text-sm"><button type="button" aria-pressed={isComplete} aria-label={`${isComplete ? "Reopen" : "Complete"} subtask ${subtask.title}`} disabled={!canEdit || saving} onClick={() => void (isComplete ? reopenTaskAction(subtask.id) : completeTaskAction(subtask.id)).then((result) => { if (!result.ok) toast.error(result.error.message); else router.refresh(); })} className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff765d]", isComplete && "border-[#3b8b69] bg-[#3b8b69] text-white")}>
            {isComplete ? <CheckCircle2 className="size-3" /> : null}
          </button><span className={cn("min-w-0 break-words", isComplete && "text-muted-foreground line-through")}>{subtask.title}</span></li>;
        })}</ul> : null}
        {canEdit ? <form onSubmit={addSubtask} className="mt-3 flex gap-2"><label className="sr-only" htmlFor={`subtask-${task.id}`}>New subtask</label><input id={`subtask-${task.id}`} value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} placeholder="Add a subtask" className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm" /><button disabled={saving} className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">Add</button></form> : null}
      </section>

      <section className="border-t border-border pt-4"><h3 className="text-sm font-semibold">Comments</h3>{task.comments?.map((item) => <article key={item.id} className="mt-3 border-l border-border pl-3"><p className="text-xs font-semibold">{item.author} <time className="font-normal text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</time>{(item.authorId === meUserId || canModerateComments) ? <button type="button" onClick={() => void deleteCommentAction(item.id).then((result) => { if (!result.ok) toast.error(result.error.message); else router.refresh(); })} className="ml-2 text-xs font-normal text-muted-foreground underline">Delete</button> : null}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{linkify(item.body)}</p></article>)}<p className="mt-2 text-xs text-muted-foreground">{canEdit ? "Leave a plain-text update for the project." : "Viewers can read comments and activity but cannot change this task."}</p>{canEdit ? <form onSubmit={submitComment} className="mt-2 flex flex-col gap-2"><label className="sr-only" htmlFor={`comment-${task.id}`}>Add a comment</label><textarea id={`comment-${task.id}`} value={comment} onChange={(event) => setComment(event.target.value)} className="min-h-16 rounded-md border border-input bg-background px-2 py-1.5 text-sm" placeholder="Add a comment" /><button disabled={saving} className="self-start rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">Post comment</button></form> : null}</section>
      <section className="border-t border-border pt-4"><h3 className="text-sm font-semibold">Activity</h3>{task.activity?.length ? task.activity.map((item) => <p key={item.id} className="mt-2 text-xs text-muted-foreground"><strong className="text-foreground">{item.actor}</strong> {item.action} <time>{new Date(item.createdAt).toLocaleString()}</time></p>) : <p className="mt-2 text-xs text-muted-foreground">No activity yet.</p>}</section>

      {onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="mt-auto inline-flex items-center gap-1.5 justify-self-start rounded-md px-2 py-1 text-xs font-bold text-[#bd503b] transition-colors hover:bg-[#ff765d]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff765d] focus-visible:ring-offset-1 dark:text-[#ff8a72]"
        >
          <Trash2 className="size-3.5" />
          Delete task
        </button>
      ) : null}
    </aside>
  );
}
