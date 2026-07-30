"use client";

import { toast } from "sonner";
import { ModeToggle } from "@/feature/components/toggle";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function Home() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex items-center justify-between border-b p-4">
          <SidebarTrigger />
          <ModeToggle />
        </header>
        <div className="p-6">
          <Button onClick={() => toast("Button clicked!")}>Show toast</Button>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
