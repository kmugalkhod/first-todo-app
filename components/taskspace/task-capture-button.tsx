"use client";

import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

/** Opens the current project's inline composer, or Inbox when no project is selected. */
export function TaskCaptureButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();

  function capture() {
    if (params.get("project")) {
      window.dispatchEvent(new Event("taskspace:new-task"));
      return;
    }
    router.push("/?view=inbox");
  }

  return <button type="button" onClick={capture} className="inline-flex h-[35px] shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)]">
    <Plus className="size-4" />
    {!compact ? <span className="hidden sm:inline">New task</span> : <span>New task</span>}
  </button>;
}
