"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";

export function AccountPhoneGate() {
  const [required, setRequired] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [userName, setUserName] = useState("");
  const [hasName, setHasName] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadAccount() {
      try {
        const response = await fetch("/api/auth", { cache: "no-store" });
        const result = await response.json() as { user?: { name?: string; email?: string; phone?: string; role?: string } | null };
        if (!active || !result.user) return;
        
        // Never gate admins or pavansai580@gmail.com
        const isAdmin = result.user.role === "admin" || result.user.email?.toLowerCase() === "pavansai580@gmail.com";
        if (isAdmin) {
          setRequired(false);
          return;
        }

        // If user already has a verified phone number, do not show
        if (result.user.phone && /^\+[1-9]\d{7,14}$/.test(result.user.phone)) {
          setRequired(false);
          return;
        }

        if (result.user.name && result.user.name !== "NILAY Member" && result.user.name !== "Terraland Member") {
          setUserName(result.user.name);
          setHasName(true);
        } else {
          setHasName(false);
        }

        if (result.user.phone) {
          const raw = result.user.phone.replace(/[\s()-]/g, "");
          if (raw.startsWith("+91")) {
            setCountryCode("+91");
            setPhoneNumber(raw.slice(3));
          } else if (/^\d{10}$/.test(raw)) {
            setCountryCode("+91");
            setPhoneNumber(raw);
          } else {
            setPhoneNumber(raw);
          }
        }

        setRequired(true);
      } catch {
        // Handled silently
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

    const cleaned = phoneNumber.trim().replace(/[\s()-]/g, "");
    if (!cleaned) {
      setError("Please enter your mobile number.");
      setSaving(false);
      return;
    }

    // Auto-normalize
    let finalPhone = "";
    if (cleaned.startsWith("+")) {
      finalPhone = cleaned;
    } else if (/^\d{10}$/.test(cleaned)) {
      finalPhone = `${countryCode}${cleaned}`;
    } else if (/^0\d{10}$/.test(cleaned)) {
      finalPhone = `${countryCode}${cleaned.slice(1)}`;
    } else if (/^91\d{10}$/.test(cleaned)) {
      finalPhone = `+${cleaned}`;
    } else {
      finalPhone = `${countryCode}${cleaned}`;
    }

    if (!/^\+[1-9]\d{7,14}$/.test(finalPhone)) {
      setError("Please enter a valid 10-digit mobile number.");
      setSaving(false);
      return;
    }

    try {
      const payload: Record<string, string> = { phone: finalPhone };
      if (!hasName && userName.trim()) {
        payload.name = userName.trim();
      }

      const response = await fetch("/api/auth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  return (
    <div className="account-phone-backdrop">
      <section className="account-phone-dialog" role="dialog" aria-modal="true" aria-labelledby="account-phone-title">
        <button
          type="button"
          className="account-phone-dialog-close"
          onClick={() => setRequired(false)}
          aria-label="Close"
          title="Close"
        >
          <X size={15} />
        </button>

        <span className="eyebrow">COMPLETE YOUR ACCOUNT</span>
        <h2 id="account-phone-title">Add your mobile number</h2>
        <p>Your mobile number is required to list property and receive direct enquiry updates on WhatsApp/SMS.</p>

        <form onSubmit={(event) => void submit(event)}>
          {!hasName && (
            <label>
              Your name
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="How should we address you?"
                maxLength={80}
              />
            </label>
          )}

          <label>
            Mobile number
            <div className="account-phone-field-group">
              <div className="account-phone-prefix">
                <span>{countryCode}</span>
              </div>
              <input
                autoFocus
                required
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                value={phoneNumber}
                onChange={(event) => {
                  let val = event.target.value.replace(/\D/g, "");
                  if (val.startsWith("91") && val.length > 10) val = val.slice(2);
                  setPhoneNumber(val.slice(0, 10));
                  setError("");
                }}
                placeholder="Enter 10-digit mobile number"
                className="account-phone-input"
              />
            </div>
            <small style={{ color: "var(--muted)", fontSize: "11px", marginTop: "2px" }}>
              Enter your 10-digit mobile number (+91 is added automatically).
            </small>
          </label>

          {error && <div className="form-error" role="alert">{error}</div>}

          <div className="account-phone-actions">
            <button className="button button-dark" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save number and continue"}
            </button>
            <button
              type="button"
              className="button button-outline-light"
              style={{ minHeight: "38px", fontSize: "12px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "var(--muted)" }}
              onClick={() => setRequired(false)}
            >
              I will add this later
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
