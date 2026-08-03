export default function WorkspaceLoading() {
  return <main className="animate-pulse px-4 py-6 sm:px-8" aria-label="Loading workspace"><div className="h-9 w-48 rounded-md bg-muted" /><div className="mt-3 h-4 w-80 max-w-full rounded bg-muted" /><div className="mt-10 space-y-3 border-t border-border pt-4">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-14 rounded-md bg-muted/60" />)}</div></main>;
}
