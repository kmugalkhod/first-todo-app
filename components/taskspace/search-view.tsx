import { Search } from "lucide-react";

import { DailyTaskList } from "./daily-task-list";
import type { TaskRowData } from "./types";
import { PageContainer, PageHeader } from "@/components/ui/page-shell";

/**
 * The cross-project search surface (Story 04 view).
 *
 * Previously this was inlined into `app/(app)/page.tsx` as one dense line with
 * a bare underlined link list and its own ad-hoc input styling. It now uses the
 * shared page furniture and the `ts-*` type scale, so search matches Inbox /
 * Today / Upcoming, and project hits are scannable rows with the citron project
 * marker rather than raw links.
 */
export function SearchView({
  query,
  projects,
  tasks,
}: {
  query: string | undefined;
  projects: Array<{ id: string; name: string }>;
  tasks: TaskRowData[];
}) {
  return (
    <main>
      <PageContainer width="wide">
        <PageHeader
          kicker="Across your projects"
          title="Search"
          description="Search task titles, descriptions, and project names you have access to."
        />

        <form className="mt-[var(--taskspace-space-section)]" role="search">
          <label className="sr-only" htmlFor="work-search">
            Search accessible tasks and projects
          </label>
          <div className="relative max-w-md">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--taskspace-muted)]"
            />
            <input
              id="work-search"
              name="q"
              type="search"
              defaultValue={query ?? ""}
              placeholder="Search tasks and projects"
              className="ts-field h-10 pl-9"
            />
          </div>
        </form>

        {query ? (
          <>
            <section className="mt-[var(--taskspace-space-content)]">
              <h2 className="ts-section">Projects</h2>
              {projects.length ? (
                <ul className="ts-panel mt-[var(--taskspace-space-compact)] divide-y divide-border overflow-hidden">
                  {projects.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`/?project=${item.id}`}
                        className="ts-body-strong flex min-h-11 items-center gap-[var(--taskspace-space-control)] px-[var(--taskspace-space-compact)] transition-colors hover:bg-[var(--taskspace-periwinkle-pale)]"
                      >
                        <span
                          aria-hidden="true"
                          className="size-[9px] shrink-0 -rotate-45 rounded-[3px] bg-[var(--taskspace-citron)]"
                        />
                        <span className="truncate">{item.name}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ts-body mt-[var(--taskspace-space-compact)]">
                  No accessible projects match.
                </p>
              )}
            </section>

            <DailyTaskList
              title="Tasks"
              description=""
              tasks={tasks}
              empty="No accessible tasks match."
              bare
            />
          </>
        ) : null}
      </PageContainer>
    </main>
  );
}
