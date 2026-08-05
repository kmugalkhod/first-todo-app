import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Shared page-level layout primitives (Taskspace design system).
 *
 * Before these existed, every secondary page (invitations, invite, search, the
 * "pick a project" prompt, error states) re-derived its own heading sizes,
 * gutters, empty-state boxes and role pills with hard-coded hex and off-scale
 * radii. These primitives are the single implementation of that furniture, so
 * all pages share one typographic hierarchy and spacing rhythm.
 *
 * Everything here is flat per DESIGN.md's Flat-Until-Floating rule: borders and
 * pale surfaces, never elevation. Type comes from the `ts-*` utilities in
 * `app/globals.css`, which are generated from the DESIGN.md scale.
 */

/**
 * A centred reading column for secondary pages. The workboard itself stays
 * full-bleed; narrow content pages (invitations, invite) use this so text
 * measure stays comfortable on wide screens.
 */
export function PageContainer({
  className,
  width = "prose",
  children,
}: {
  className?: string;
  /** `prose` for reading/list pages, `wide` for the dashboard-scale content. */
  width?: "prose" | "wide";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "ts-gutter mx-auto w-full pb-[var(--taskspace-space-content)] pt-[var(--taskspace-space-section)] sm:pt-[var(--taskspace-space-content)]",
        width === "prose" ? "max-w-2xl" : "max-w-[1200px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The canonical page header: optional small uppercase kicker, a display-face
 * title, a body-copy description, and an optional trailing action cluster.
 * This keeps "what page am I on" identical everywhere.
 */
export function PageHeader({
  kicker,
  title,
  description,
  actions,
  className,
  /** `page` for secondary pages; `canvas` for the large project canvas voice. */
  size = "page",
}: {
  kicker?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  size?: "page" | "canvas";
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-[var(--taskspace-space-compact)] sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {kicker ? <p className="ts-label">{kicker}</p> : null}
        <h1
          className={cn(
            size === "canvas" ? "ts-display" : "ts-display-sm",
            kicker && "mt-[var(--taskspace-space-tight)]",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="ts-body mt-[var(--taskspace-space-control)] max-w-[570px]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-[var(--taskspace-space-tight)]">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

/**
 * The shared empty state. One quiet dashed panel with an optional icon badge,
 * a short title, supporting copy and an optional action — replacing the three
 * differently-styled empty boxes the app previously had.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ts-empty", className)}>
      {icon ? (
        <span
          aria-hidden="true"
          className="mb-[var(--taskspace-space-micro)] flex size-10 items-center justify-center rounded-full bg-[var(--taskspace-periwinkle-pale)] text-[var(--taskspace-cobalt)]"
        >
          {icon}
        </span>
      ) : null}
      <p className="ts-body-strong">{title}</p>
      {description ? (
        <p className="ts-body max-w-xs">{description}</p>
      ) : null}
      {action ? (
        <div className="mt-[var(--taskspace-space-tight)]">{action}</div>
      ) : null}
    </div>
  );
}

/**
 * Inline error/notice banner. Coral is the attention signal per DESIGN.md, so
 * failures read consistently instead of each page inventing a red box.
 */
export function NoticeBanner({
  children,
  className,
  tone = "attention",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "attention" | "info";
}) {
  return (
    <p
      role="alert"
      className={cn(
        "rounded-[var(--taskspace-radius-panel)] border p-[var(--taskspace-space-compact)] text-[length:var(--taskspace-font-size-body)] leading-[1.55]",
        tone === "attention"
          ? "border-[color-mix(in_srgb,var(--taskspace-coral)_45%,transparent)] bg-[var(--taskspace-priority-p1-surface)] text-[var(--taskspace-priority-p1-ink)]"
          : "border-border bg-[var(--taskspace-periwinkle-pale)] text-[var(--taskspace-cobalt-deep)]",
        className,
      )}
    >
      {children}
    </p>
  );
}

/**
 * Role pill (Owner / Editor / Viewer). Roles are structural metadata, so they
 * use the restrained periwinkle/neutral tints — never citron, coral or green,
 * which carry ownership, attention and completion meaning.
 */
export function RolePill({
  role,
  className,
}: {
  role: "owner" | "editor" | "viewer";
  className?: string;
}) {
  const tone: Record<typeof role, string> = {
    owner:
      "bg-[var(--taskspace-priority-p3-surface)] text-[var(--taskspace-priority-p3-ink)]",
    editor:
      "bg-[var(--taskspace-priority-p3-surface)] text-[var(--taskspace-priority-p3-ink)]",
    viewer:
      "bg-[var(--taskspace-priority-p4-surface)] text-[var(--taskspace-priority-p4-ink)]",
  };
  const label = `${role.charAt(0).toUpperCase()}${role.slice(1)}`;
  return <span className={cn("ts-pill", tone[role], className)}>{label}</span>;
}
