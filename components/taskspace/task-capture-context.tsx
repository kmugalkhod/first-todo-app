"use client";

import * as React from "react";

type TaskCaptureContextValue = {
  requestTaskCapture: () => void;
  registerTaskCapture: (handler: () => void) => () => void;
};

const TaskCaptureContext = React.createContext<TaskCaptureContextValue | null>(
  null,
);

/**
 * Connects the persistent shell action to the currently mounted workboard.
 * Requests made before the workboard effect registers are queued instead of
 * being dropped, which makes the topbar action reliable during hydration.
 */
export function TaskCaptureProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const handlerRef = React.useRef<(() => void) | null>(null);
  const queuedRef = React.useRef(false);

  const requestTaskCapture = React.useCallback(() => {
    if (handlerRef.current) {
      handlerRef.current();
      return;
    }
    queuedRef.current = true;
  }, []);

  const registerTaskCapture = React.useCallback((handler: () => void) => {
    handlerRef.current = handler;
    if (queuedRef.current) {
      queuedRef.current = false;
      handler();
    }
    return () => {
      if (handlerRef.current === handler) handlerRef.current = null;
    };
  }, []);

  const value = React.useMemo(
    () => ({ requestTaskCapture, registerTaskCapture }),
    [registerTaskCapture, requestTaskCapture],
  );

  return (
    <TaskCaptureContext.Provider value={value}>
      {children}
    </TaskCaptureContext.Provider>
  );
}

export function useTaskCapture() {
  const value = React.useContext(TaskCaptureContext);
  if (!value) {
    throw new Error("useTaskCapture must be used inside TaskCaptureProvider.");
  }
  return value;
}
