"use client";

import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/ui/page-shell";

/**
 * Error boundary for the protected workspace. It renders inside the app shell
 * (sidebar + topbar stay mounted), so it uses the shared page furniture rather
 * than its own one-off heading and button styling.
 */
export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main>
      <PageContainer width="wide">
        <PageHeader
          kicker="Taskspace"
          title="This view isn't available right now."
          description="Please retry. If your access changed, choose another project from the sidebar."
        />
        <Button
          type="button"
          size="lg"
          onClick={reset}
          className="mt-[var(--taskspace-space-section)] rounded-[var(--taskspace-radius-control)]"
        >
          Try again
        </Button>
      </PageContainer>
    </main>
  );
}
