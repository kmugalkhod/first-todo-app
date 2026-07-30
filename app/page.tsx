"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main>
      <p>I am learning next js</p>
      <Button onClick={() => toast("Button clicked!")}>Show toast</Button>
    </main>
  );
}
