"use client";

export default function WorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="px-4 py-10 sm:px-8"><section className="max-w-xl border-y border-dashed border-border py-10"><h1 className="font-heading text-2xl tracking-[-0.035em] text-foreground">This view isn’t available right now.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Please retry. If your access changed, choose another project from the sidebar.</p><button type="button" onClick={reset} className="mt-5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)]">Try again</button></section></main>;
}
