"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

export function SaveButton({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`/api/favorites?propertyId=${encodeURIComponent(propertyId)}`)
      .then(async (response) => {
        if (response.ok) {
          const result = await response.json() as { saved: boolean };
          if (active) setSaved(result.saved);
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [propertyId]);
  async function toggle() {
    setBusy(true);
    try {
      const response = saved
        ? await fetch(`/api/favorites?propertyId=${encodeURIComponent(propertyId)}`, { method: "DELETE" })
        : await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propertyId }) });
      if (response.status === 401) {
        router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!response.ok) throw new Error("Could not update saved listings.");
      setSaved(!saved);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not update saved listings.");
    } finally {
      setBusy(false);
    }
  }
  return <button className={`save-button${saved ? " is-saved" : ""}`} onClick={toggle} disabled={busy} aria-label={saved ? "Remove from saved" : "Save listing"} aria-pressed={saved}><Heart size={17} fill={saved ? "currentColor" : "none"} /></button>;
}
