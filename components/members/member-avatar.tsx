"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/** Derive 1–2 initials from a name (fall back to email, then "?"). */
export function memberInitials(
  name?: string | null,
  email?: string | null,
): string {
  const source = name?.trim() || email?.trim() || "";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (source[0] ?? "?").toUpperCase();
}

/**
 * A single person's avatar in the Taskspace idiom: a fully circular avatar
 * with the citron fill reserved for the Owner (Signal-Colours Rule) and a cool
 * periwinkle fill for everyone else. `ringClassName` tints the separation ring
 * to the surrounding surface (cobalt on the sidebar, `ring-background` on light
 * surfaces) so overlapping stacks stay legible without off-palette borders.
 */
export function MemberAvatar({
  name,
  email,
  isOwner = false,
  ringClassName = "ring-background",
  className,
}: {
  name?: string | null;
  email?: string | null;
  isOwner?: boolean;
  ringClassName?: string;
  className?: string;
}) {
  return (
    <Avatar
      size="sm"
      className={cn(
        "shrink-0 ring-2",
        ringClassName,
        isOwner
          ? "bg-[#edff81] text-[#202550]"
          : "bg-[#a9b0ee] text-[#202550]",
        className,
      )}
    >
      <AvatarFallback
        className={cn(
          "rounded-full text-[0.6rem] font-[800]",
          isOwner ? "bg-[#edff81] text-[#202550]" : "bg-[#a9b0ee] text-[#202550]",
        )}
      >
        {memberInitials(name, email)}
      </AvatarFallback>
    </Avatar>
  );
}
