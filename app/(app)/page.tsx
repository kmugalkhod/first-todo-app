"use client";

import * as React from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Inbox,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "completed";

type Task = {
  id: number;
  title: string;
  due: string;
  priority: "High" | "Medium" | "Low";
  completed: boolean;
};

const initialTasks: Task[] = [
  {
    id: 1,
    title: "Map out the first task flow",
    due: "Today",
    priority: "High",
    completed: false,
  },
  {
    id: 2,
    title: "Write down the next three priorities",
    due: "Today",
    priority: "Medium",
    completed: false,
  },
  {
    id: 3,
    title: "Review the project setup",
    due: "Tomorrow",
    priority: "Low",
    completed: false,
  },
  {
    id: 4,
    title: "Set up the task workspace",
    due: "Done",
    priority: "Medium",
    completed: true,
  },
];

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Open" },
  { value: "completed", label: "Completed" },
];

const priorityStyles: Record<Task["priority"], string> = {
  High: "bg-[#fff0ea] text-[#ab2e21] dark:bg-[#7c251c]/35 dark:text-[#ffb5a6]",
  Medium:
    "bg-[#fff7dc] text-[#8a5a00] dark:bg-[#76540b]/35 dark:text-[#f9d98a]",
  Low: "bg-[#eef7f1] text-[#256443] dark:bg-[#1d5d3a]/35 dark:text-[#a9dfc1]",
};

export default function Home() {
  const [tasks, setTasks] = React.useState(initialTasks);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [isComposerOpen, setIsComposerOpen] = React.useState(false);
  const [taskTitle, setTaskTitle] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const openTaskCount = tasks.filter((task) => !task.completed).length;
  const visibleTasks = tasks.filter((task) => {
    if (filter === "active") return !task.completed;
    if (filter === "completed") return task.completed;
    return true;
  });

  const openComposer = React.useCallback(() => {
    setIsComposerOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  React.useEffect(() => {
    window.addEventListener("todo:add-task", openComposer);
    return () => window.removeEventListener("todo:add-task", openComposer);
  }, [openComposer]);

  function toggleTask(id: number) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    );
  }

  function deleteTask(id: number) {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
    toast.success("Task deleted");
  }

  function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = taskTitle.trim();

    if (!title) {
      inputRef.current?.focus();
      return;
    }

    setTasks((currentTasks) => [
      {
        id: Date.now(),
        title,
        due: "Today",
        priority: "Medium",
        completed: false,
      },
      ...currentTasks,
    ]);
    setTaskTitle("");
    setIsComposerOpen(false);
    toast.success("Task added");
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8 sm:py-12 lg:px-12">
          <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-primary">Today</p>
                <h1 className="font-heading mt-1 text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
                  Make room for what matters.
                </h1>
                <p className="mt-3 max-w-xl text-[0.98rem] leading-7 text-muted-foreground">
                  {openTaskCount === 0
                    ? "Everything is clear. Enjoy the space."
                    : openTaskCount +
                      " open " +
                      (openTaskCount === 1 ? "task" : "tasks") +
                      " waiting for your attention."}
                </p>
              </div>
            </div>

            {isComposerOpen && (
              <form
                onSubmit={addTask}
                className="animate-in fade-in-0 slide-in-from-top-1 border-y border-border py-4 duration-200"
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    ref={inputRef}
                    value={taskTitle}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    placeholder="What needs to get done?"
                    aria-label="New task title"
                    className="h-11 rounded-xl bg-muted/35 px-3.5 text-base shadow-none focus-visible:bg-background"
                  />
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <p className="hidden text-sm text-muted-foreground sm:block">
                      Press Enter to add
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 rounded-xl px-3"
                      onClick={() => {
                        setTaskTitle("");
                        setIsComposerOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            )}

            <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
              <div
                className="flex min-w-0 gap-1 overflow-x-auto"
                role="tablist"
                aria-label="Task filters"
              >
                {filters.map((item) => {
                  const isActive = filter === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setFilter(item.value)}
                      className={cn(
                        "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        isActive
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <p className="shrink-0 text-sm text-muted-foreground">
                {visibleTasks.length}{" "}
                {visibleTasks.length === 1 ? "task" : "tasks"}
              </p>
            </div>

            {visibleTasks.length > 0 ? (
              <ul className="divide-y divide-border" aria-label="Tasks">
                {visibleTasks.map((task) => (
                  <li
                    key={task.id}
                    className="group flex items-start gap-3 py-4 sm:gap-4"
                  >
                    <button
                      type="button"
                      aria-label={
                        task.completed
                          ? "Mark " + task.title + " as open"
                          : "Mark " + task.title + " as complete"
                      }
                      aria-pressed={task.completed}
                      onClick={() => toggleTask(task.id)}
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        task.completed
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/50 text-transparent hover:border-primary hover:text-primary",
                      )}
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[0.98rem] font-medium leading-6",
                          task.completed
                            ? "text-muted-foreground line-through"
                            : "text-foreground",
                        )}
                      >
                        {task.title}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          {task.completed ? (
                            <CheckCircle2 className="size-3.5" />
                          ) : task.due === "Today" ? (
                            <CalendarDays className="size-3.5 text-primary" />
                          ) : (
                            <Inbox className="size-3.5" />
                          )}
                          {task.due}
                        </span>
                        {!task.completed && (
                          <span
                            className={cn(
                              "rounded-md px-2 py-1",
                              priorityStyles[task.priority],
                            )}
                          >
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={"Delete " + task.title}
                      onClick={() => deleteTask(task.id)}
                      className="-mr-2 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-start gap-3 border-y border-dashed border-border py-10">
                <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Circle className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Nothing here yet
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Add a task, or choose another view to continue.
                  </p>
                </div>
              </div>
            )}
          </section>
        </main>
  );
}
