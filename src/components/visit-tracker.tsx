"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function VisitTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef("");

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname === lastTrackedPath.current) return;
    lastTrackedPath.current = pathname;
    void fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathname }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
