"use client";

import { toast } from "sonner";
import { ModeToggle } from "@/feature/components/toggle";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="p-6">
      <div className="flex justify-end">
        <ModeToggle />
      </div>
      <p>I am learning next js</p>
      <Button onClick={() => toast("Button clicked!")}>Show toast</Button>
    </main>
  );
}
