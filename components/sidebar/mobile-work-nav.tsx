"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Inbox", view: "inbox" },
  { label: "Today", view: "today" },
  { label: "Upcoming", view: "upcoming" },
] as const;

/**
 * The mobile counterpart to the desktop sidebar. It deliberately keeps the
 * four highest-value destinations above the lower edge while task detail can
 * remain open as a sheet over the list.
 */
export function MobileWorkNav() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const projectId = searchParams.get("project");
  const projectHref = projectId ? `/?project=${projectId}` : "/";

  return (
    <nav
      aria-label="Mobile workspace navigation"
      className="fixed inset-x-[var(--taskspace-space-compact)] bottom-[var(--taskspace-space-compact)] z-40 grid grid-cols-4 gap-[var(--taskspace-space-micro)] rounded-[var(--taskspace-radius-mobile-tray)] border border-white/40 bg-[var(--taskspace-cobalt-deep)] p-[var(--taskspace-radius-chip)] text-white shadow-[var(--taskspace-mobile-tray-shadow)] min-[801px]:hidden"
    >
      {ITEMS.map((item) => {
        const active = view === item.view;
        return (
          <Link
            key={item.view}
            href={`/?view=${item.view}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-[35px] items-center justify-center rounded-[var(--taskspace-radius-control)] px-1 text-center text-[length:var(--taskspace-font-size-micro)] font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--taskspace-cobalt-deep)]",
              active ? "bg-white/15" : "hover:bg-white/10",
            )}
          >
            {item.label}
          </Link>
        );
      })}
      <Link
        href={projectHref}
        aria-current={!view ? "page" : undefined}
        className={cn(
          "flex min-h-[35px] items-center justify-center rounded-[var(--taskspace-radius-control)] px-1 text-center text-[length:var(--taskspace-font-size-micro)] font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taskspace-coral)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--taskspace-cobalt-deep)]",
          !view ? "bg-white/15" : "hover:bg-white/10",
        )}
      >
        Project
      </Link>
    </nav>
  );
}
