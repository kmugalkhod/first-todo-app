"use client";

import { CheckCircle2, Inbox, ListTodo, Plus, Settings } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "All tasks", icon: ListTodo, active: true },
  { title: "Inbox", icon: Inbox },
  { title: "Completed", icon: CheckCircle2 },
  { title: "Settings", icon: Settings },
];

export function AppSidebar({ openTaskCount }: { openTaskCount: number }) {
  return (
    <Sidebar className="border-r border-sidebar-border/80">
      <SidebarHeader className="px-4 pb-3 pt-5">
        <div className="flex items-center gap-2.5 px-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-[0_8px_18px_-12px_oklch(0.52_0.19_32_/_0.9)]">
            T
          </span>
          <span className="text-[0.95rem] font-semibold tracking-[-0.02em] text-sidebar-foreground">
            Taskspace
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup className="pt-1">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-11 gap-3 rounded-xl bg-primary px-3 text-[0.95rem] font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                  onClick={() =>
                    window.dispatchEvent(new Event("todo:add-task"))
                  }
                >
                  <span className="flex size-6 items-center justify-center rounded-lg bg-primary-foreground/15">
                    <Plus className="size-4" strokeWidth={2.5} />
                  </span>
                  <span>Add task</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="pt-6">
          <SidebarGroupLabel className="px-3 text-[0.68rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={item.active}
                    className="h-10 gap-3 rounded-lg px-3 text-[0.92rem] text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground"
                  >
                    <item.icon className="size-[18px]" strokeWidth={1.9} />
                    <span>{item.title}</span>
                    {item.title === "All tasks" && openTaskCount > 0 && (
                      <span className="ml-auto text-xs font-medium text-muted-foreground">
                        {openTaskCount}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
