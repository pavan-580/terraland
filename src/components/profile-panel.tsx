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
      <label>
        Phone number
        <div className="phone-input-wrap" style={{ marginTop: "6px" }}>
          <span className="phone-input-prefix">+91</span>
          <input
            name="phone"
            required
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            pattern="[0-9]{10}"
            maxLength={10}
            defaultValue={user.phone ? user.phone.replace(/^\+91/, "").replace(/\D/g, "") : ""}
            placeholder="Enter 10-digit mobile number"
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              const clean = (val.startsWith("91") && val.length > 10) ? val.slice(2) : val;
              e.target.value = clean.slice(0, 10);
            }}
          />
        </div>
        <small>Enter your 10-digit mobile number (+91 is added automatically). Required for signing in.</small>
      </label>
      <label>Email address <span className="optional-label">optional, for password recovery</span><input name="email" type="email" autoComplete="email" defaultValue={user.email} placeholder="you@example.com" /></label>
      <div className="profile-form-actions"><button className="button button-dark" type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile"} <ArrowUpRight size={15} /></button></div>
    </form>
  </section>;
}
