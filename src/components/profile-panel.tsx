"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

type ProfileDetails = { id: string; name: string; email: string; phone: string; role: "user" | "admin" };

export function ProfilePanel({ user }: { user: ProfileDetails }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/auth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? "Your profile could not be saved.");
      setMessage(result.message ?? "Profile saved.");
      window.dispatchEvent(new Event("terraland:account-changed"));
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your profile could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="profile-panel">
    <div className="profile-panel-heading">
      <div><span className="eyebrow">ACCOUNT DETAILS</span><h2>Your profile</h2></div>
      <span className="profile-login-note">Sign in with your phone or email and password.</span>
    </div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {message && <div className="admin-success" role="status">{message}</div>}
    <form className="profile-form" onSubmit={(event) => void save(event)}>
      <label>Full name<input name="name" required minLength={2} maxLength={80} defaultValue={user.name} autoComplete="name" /></label>
      <label>Phone number<input name="phone" required type="tel" inputMode="tel" autoComplete="tel" pattern="\+[1-9][0-9 ()-]{7,22}" defaultValue={user.phone} placeholder="+91 98765 43210" /><small>Your phone number is required and can be used to sign in.</small></label>
      <label>Email address <span className="optional-label">optional, for password recovery</span><input name="email" type="email" autoComplete="email" defaultValue={user.email} placeholder="you@example.com" /></label>
      <div className="profile-form-actions"><button className="button button-dark" type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile"} <ArrowUpRight size={15} /></button></div>
    </form>
  </section>;
}
