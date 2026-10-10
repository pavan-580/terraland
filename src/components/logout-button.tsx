"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth", { method: "DELETE" });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Sign out failed. Please try again.");
      window.dispatchEvent(new Event("terraland:account-changed"));
      router.push("/");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign out failed. Please try again.");
      setBusy(false);
    }
  }

  return <span className="logout-control">
    <button className="logout-button" type="button" disabled={busy} onClick={() => void logout()}>{busy ? "Signing out…" : "Sign out"}</button>
    {error && <span className="header-auth-error" role="alert">{error}</span>}
  </span>;
}
