"use client";

/** Keeps an unexpected route error recoverable without exposing server details. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body className="min-h-svh bg-background p-6 text-foreground"><main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Taskspace</p><h1 className="mt-3 font-heading text-3xl tracking-[-0.04em]">We couldn’t open this workspace.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Nothing you entered was lost. Try loading the page again.</p><button type="button" onClick={reset} className="mt-6 w-fit rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)]">Try again</button></main></body></html>;
}
