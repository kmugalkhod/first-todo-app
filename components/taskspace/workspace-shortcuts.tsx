"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useTaskCapture } from "./task-capture-context";

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    target.matches("input, textarea, select, [contenteditable='true']")
  );
}

/** Small, discoverable workspace shortcuts that never steal text input. */
export function WorkspaceShortcuts() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { requestTaskCapture } = useTaskCapture();

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        const input = document.getElementById("workspace-search");
        if (input instanceof HTMLInputElement) {
          input.focus();
          input.select();
        }
        return;
      }

      if (event.key.toLowerCase() !== "q") return;
      event.preventDefault();
      requestTaskCapture();
      if (searchParams.get("project") && !searchParams.get("view")) return;
      if (searchParams.get("view") === "inbox") return;
      router.push("/?view=inbox");
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestTaskCapture, router, searchParams]);

  return null;
}
