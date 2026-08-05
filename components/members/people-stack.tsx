"use client";

import type { MemberDTO } from "@/lib/data-access";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "./member-avatar";

/**
 * Overlapping "people" stack (per the golden reference's `.people` / `.avatar`
 * idiom): up to `max` avatars shown with a small count pill for the overflow.
 * The Owner's avatar is the citron fill; everyone else uses the cool periwinkle
 * tone, so ownership is legible at a glance (Signal-Colours Rule).
 */
export function PeopleStack({
  members,
  max = 4,
  ringClassName = "ring-background",
  className,
  showCount = true,
}: {
  members: Pick<MemberDTO, "name" | "email" | "role">[];
  max?: number;
  ringClassName?: string;
  className?: string;
  showCount?: boolean;
}) {
  const visible = members.slice(0, max);
  const hidden = members.length - visible.length;

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex -space-x-2">
        {visible.map((member, i) => (
          <MemberAvatar
            key={i}
            name={member.name}
            email={member.email}
            isOwner={member.role === "owner"}
            ringClassName={ringClassName}
            className="size-[23px]"
          />
        ))}
        {showCount && hidden > 0 ? (
          <span
            className={cn(
              "relative z-10 -ml-2 flex size-[23px] items-center justify-center rounded-full bg-[var(--taskspace-avatar-surface)] text-[length:var(--taskspace-font-size-chip)] font-[var(--taskspace-weight-display)] text-[var(--taskspace-ink)] ring-2",
              ringClassName,
            )}
          >
            +{hidden}
          </span>
        ) : null}
      </div>
    </div>
  );
}
