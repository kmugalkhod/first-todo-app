"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Adds the browser IANA zone once so the server can query calendar days correctly. */
export function TimezoneSync() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    if (searchParams.get("tz")) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
