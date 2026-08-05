"use client";

import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/ui/page-shell";

/**
 * Keeps an unexpected route error recoverable without replacing the root
 * layout. It reuses the shared page furniture so a failure still looks like
 * Taskspace rather than an unstyled fallback.
 */
export default function RouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-svh items-center bg-[var(--taskspace-canvas)]">
      <PageContainer>
        <div className="ts-panel p-[var(--taskspace-space-section)] sm:p-[var(--taskspace-space-content)]">
          <PageHeader
            kicker="Taskspace"
            title="We couldn't open this workspace."
            description="Nothing you entered was lost. Try loading the page again."
          />
          <Button
            type="button"
            size="lg"
            onClick={reset}
            className="mt-[var(--taskspace-space-section)] rounded-[var(--taskspace-radius-control)]"
          >
            Try again
          </Button>
        </div>
      </PageContainer>
    </main>
  );
}
