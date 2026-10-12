"use client";

import { useEffect, useState, type FormEvent } from "react";

export function AccountPhoneGate() {
  const [required, setRequired] = useState(false);
  const [phone, setPhone] = useState("+91 ");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadAccount() {
      try {
        const response = await fetch("/api/auth", { cache: "no-store" });
        const result = await response.json() as { user?: { phone?: string } | null };
        if (active && result.user && !result.user.phone) setRequired(true);
        if (active && result.user?.phone) setPhone(result.user.phone);
      } catch {
        // Account pages and the enquiry form handle their own connection errors.
      }
    }
    void loadAccount();
    window.addEventListener("terraland:account-changed", loadAccount);
    return () => {
      active = false;
      window.removeEventListener("terraland:account-changed", loadAccount);
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Your number could not be saved.");
      setRequired(false);
      window.dispatchEvent(new Event("terraland:account-changed"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your number could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!required) return null;
  return <div className="account-phone-backdrop">
    <section className="account-phone-dialog" role="dialog" aria-modal="true" aria-labelledby="account-phone-title">
      <span className="eyebrow">COMPLETE YOUR ACCOUNT</span>
      <h2 id="account-phone-title">Add your mobile number</h2>
      <p>Your mobile number is required to list property or send enquiries. Include your country code; +91 is prefilled for India.</p>
      <form onSubmit={(event) => void submit(event)}>
        <label>Mobile number<input autoFocus required type="tel" inputMode="tel" autoComplete="tel" pattern="\+[1-9][0-9 ()-]{7,22}" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button button-dark" type="submit" disabled={saving}>{saving ? "Saving…" : "Save number and continue"}</button>
      </form>
    </section>
  </div>;
}
