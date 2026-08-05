"use client";

import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTaskCapture } from "./task-capture-context";

/** Opens the current project's inline composer, or Inbox when no project is selected. */
export function TaskCaptureButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const { requestTaskCapture } = useTaskCapture();

  function capture() {
    // Queue the intent first. If the project workboard is mounted it opens at
    // once; otherwise Inbox consumes the queued request after navigation.
    requestTaskCapture();
    if (params.get("project") && !params.get("view")) {
      return;
    }
    if (params.get("view") === "inbox") return;
    router.push("/?view=inbox");
  }

  return (
    <button
      type="button"
      onClick={capture}
      aria-keyshortcuts="Q"
      title="New task (Q)"
      className="group inline-flex h-[35px] shrink-0 items-center gap-1.5 rounded-[var(--taskspace-radius-control)] bg-[var(--taskspace-cobalt)] px-3 text-xs font-extrabold text-white transition-[background-color,transform] duration-150 hover:bg-[var(--taskspace-cobalt-deep)] active:translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)] focus-visible:ring-offset-2 motion-reduce:transition-none"
    >
      <Plus className="size-4 transition-transform duration-150 group-active:rotate-45 motion-reduce:transition-none" />
      {!compact ? (
        <span className="hidden sm:inline">New task</span>
      ) : (
        <span>New task</span>
      )}
    </button>
  );
}
