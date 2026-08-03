"use client";

import {
  CalendarDays,
  CheckCircle2,
  Circle,
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
      className="flex flex-col gap-5 rounded-t-2xl border-l border-border/70 bg-[#eef0ff]/55 p-5 sm:rounded-r-2xl dark:bg-[#eef0ff]/5"
    >
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {projectName}
        {sectionName ? ` / ${sectionName}` : ""}
      </p>

      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 size-4 shrink-0",
            completed
              ? "text-primary"
              : task.overdue
                ? "text-[#bd503b] dark:text-[#ff8a72]"
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
            "font-heading text-xl font-semibold tracking-[-0.02em] text-foreground",
            completed && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </h2>
      </div>

      {canEdit ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void update({ title: String(data.get("title")), description: String(data.get("description")) || null, priority: String(data.get("priority")) as TaskRowData["priority"], scheduledFor: data.get("scheduledFor") ? new Date(String(data.get("scheduledFor"))) : null }); }} className="flex flex-col gap-2 border-y border-border py-3"><label className="text-xs font-semibold" htmlFor={`title-${task.id}`}>Task details</label><input id={`title-${task.id}`} name="title" defaultValue={task.title} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" /><textarea name="description" defaultValue={task.description ?? ""} className="min-h-20 rounded-md border border-input bg-background px-2 py-1.5 text-sm" /><div className="grid grid-cols-2 gap-2"><select name="priority" defaultValue={task.priority} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"><option value="p1">P1</option><option value="p2">P2</option><option value="p3">P3</option><option value="p4">P4</option></select><input name="scheduledFor" type="date" defaultValue={task.scheduledFor?.slice(0, 10) ?? ""} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" /></div><button disabled={saving} className="self-start rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">Save details</button></form> : null}

      {task.description ? (
        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {task.description}
        </p>
      ) : (
        <p className="text-sm italic text-muted-foreground/70">
          No description yet.
        </p>
      )}

      <dl className="flex flex-col gap-1.5 text-sm">
        {task.scheduledFor ? (
          <div className="flex items-center gap-2.5 text-foreground">
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <dt className="sr-only">Due</dt>
            <dd
              className={cn(
                "font-medium",
                task.overdue && "text-[#bd503b] dark:text-[#ff8a72]",
              )}
            >
              {task.overdue ? `Overdue · ${dueLabel}` : dueLabel}
            </dd>
          </div>
        ) : null}

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-muted-foreground">
            Priority
          </span>
          <dt className="sr-only">Priority</dt>
          <dd className="font-medium">{priorityLabel(task.priority)}</dd>
        </div>

        {task.labels.length > 0 ? (
          <div className="flex items-center gap-2.5">
            <Tag className="size-4 shrink-0 text-muted-foreground" />
            <dt className="sr-only">Labels</dt>
            <dd className="flex flex-wrap gap-1.5">
              {task.labels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex h-5 items-center rounded-[5px] bg-[#e9f7ec] px-1.5 text-[0.62rem] font-bold text-[#37734f] dark:bg-[#1d5d3a]/35 dark:text-[#a9dfc1]"
                >
                  {label.name}
                </span>
              ))}
            </dd>
          </div>
        ) : null}

        {task.owner ? (
          <div className="flex items-center gap-2.5">
            <User className="size-4 shrink-0 text-muted-foreground" />
            <dt className="sr-only">Owner</dt>
            <dd className="flex items-center gap-2 font-medium">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-[0.62rem] font-extrabold text-[#252d95] dark:text-[#1d2350]",
                  isOwnedByMe ? "bg-[#edff81]" : "bg-[#bcc2ee] dark:bg-[#3a428f]",
                )}
              >
                {initials(task.owner.name)}
              </span>
              {task.owner.name}
            </dd>
          </div>
        ) : null}
      </dl>

      {canEdit ? <div className="flex flex-col gap-2 border-y border-border py-3"><label className="text-xs font-semibold" htmlFor={`assignee-${task.id}`}>Assignee</label><select id={`assignee-${task.id}`} value={task.owner?.id ?? ""} onChange={(event) => void assignTaskAction(task.id, event.target.value || null).then((result) => { if (!result.ok) toast.error(result.error.message); else router.refresh(); })} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"><option value="">No assignee</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><fieldset><legend className="text-xs font-semibold">Labels</legend><div className="mt-1 flex flex-wrap gap-2">{availableLabels.map((label) => <span key={label.id} className="inline-flex items-center gap-1 text-xs"><input type="checkbox" aria-label={`Apply ${label.name}`} defaultChecked={task.labels.some((item) => item.id === label.id)} onChange={(event) => { const next = event.currentTarget.checked ? [...task.labels.map((item) => item.id), label.id] : task.labels.filter((item) => item.id !== label.id).map((item) => item.id); void setTaskLabelsAction(task.id, next).then((result) => { if (!result.ok) toast.error(result.error.message); else router.refresh(); }); }} /><button type="button" className="underline" onClick={() => { const name = window.prompt("Rename label", label.name); if (name?.trim()) void updateLabelAction(label.id, { name }).then((result) => { if (!result.ok) toast.error(result.error.message); else router.refresh(); }); }}>{label.name}</button><button type="button" aria-label={`Delete label ${label.name}`} className="text-muted-foreground" onClick={() => void deleteLabelAction(label.id).then((result) => { if (!result.ok) toast.error(result.error.message); else router.refresh(); })}>×</button></span>)}</div><form onSubmit={createLabel} className="mt-2 flex gap-2"><label className="sr-only" htmlFor={`label-${task.id}`}>New label</label><input id={`label-${task.id}`} value={labelName} onChange={(event) => setLabelName(event.target.value)} className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm" placeholder="New label" /><button className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">Create</button></form></fieldset></div> : null}

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
