"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  ChevronsUpDown,
  Inbox,
  ListTodo,
  LogOut,
  Plus,
  Users,
} from "lucide-react";

import { authClient } from "@/lib/auth/client";
import type { User } from "@/lib/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

/**
 * The `--sidebar*` custom properties resolve to cobalt here (see globals.css);
 * the whole navigation field reads as the Taskspace cobalt field with white
 * brand, muted-periwinkle labels and translucent-white hover/active fills.
 */
const workspaceItems = [
  { title: "All tasks", icon: ListTodo, active: true },
  { title: "Inbox", icon: Inbox },
  { title: "Upcoming", icon: CalendarClock },
  { title: "Completed", icon: CheckCircle2 },
];

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (source[0] ?? "?").toUpperCase();
}

function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleSignOut() {
    setPending(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.replace("/sign-in");
          router.refresh();
        },
      },
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff765d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#3543d6] data-[popup-open]:bg-white/10">
        <Avatar className="size-8 shrink-0">
          <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
          <AvatarFallback className="bg-white/20 font-semibold text-white">
            {initials(user.displayName, user.email)}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.72rem] font-semibold leading-4 text-white">
            {user.displayName || user.email.split("@")[0] || "You"}
          </span>
          <span className="mt-0.5 block truncate text-[0.61rem] leading-3.5 text-[#c9cdfd]">
            {user.displayName ? user.email : "Your workspace"}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-white/50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="right"
        className="w-60"
        sideOffset={8}
      >
        <div className="flex flex-col gap-0.5 px-1.5 py-1.5">
          <span className="text-sm font-semibold">
            {user.displayName || user.email}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={pending} onClick={handleSignOut}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppSidebar({ user }: { user: User }) {
  return (
    <Sidebar className="border-r border-white/10" collapsible="offcanvas">
      <SidebarHeader className="px-4 pb-3 pt-5">
        <div className="flex items-center gap-2.5 px-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-white font-bold text-[#202550] shadow-[0_8px_18px_-12px_rgba(10,10,40,0.9)]">
            T
          </span>
          <span className="text-[0.95rem] font-extrabold tracking-[-0.04em] text-white">
            Taskspace
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-2 pt-1">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  data-nav="create"
                  className="h-11 gap-3 rounded-xl border border-white/25 bg-white/10 px-3 text-[0.75rem] font-[760] text-white hover:bg-white/20 hover:text-white data-[active=true]:border-white/25 data-[active=true]:bg-white/20 data-[active=true]:text-white"
                  onClick={() =>
                    window.dispatchEvent(new Event("todo:add-task"))
                  }
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#edff81] text-[#202550]">
                    <Plus className="size-4" strokeWidth={2.75} />
                  </span>
                  <span>Add task</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="pt-6">
          <SidebarGroupLabel className="px-2 text-[0.62rem] font-[750] uppercase tracking-[0.08em] text-[#c9cdfd]">
            Your work
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={item.active}
                    className="h-[34px] gap-[9px] rounded-lg px-2.5 text-[0.74rem] font-[650] text-[#e1e3ff] hover:bg-white/10 hover:text-[#e1e3ff] data-[active=true]:bg-white/15"
                  >
                    <item.icon className="size-[15px]" strokeWidth={1.8} />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="pb-4 pt-6">
          <SidebarGroupLabel className="px-2 text-[0.62rem] font-[750] uppercase tracking-[0.08em] text-[#c9cdfd]">
            Projects
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <p className="px-3 pt-1 text-xs leading-5 text-[#c9cdfd]/75">
              Create a project to bring teammates together.
            </p>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 pb-4">
        <div className="px-2 pb-3">
          <p className="flex items-center gap-1.5 text-[0.62rem] font-[750] uppercase tracking-[0.08em] text-[#c9cdfd]">
            <Users className="size-3.5" />
            People
          </p>
          <p className="pl-3.5 pt-1 text-xs leading-5 text-[#c9cdfd]/75">
            No collaborators yet.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-1.5">
          <UserMenu user={user} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
