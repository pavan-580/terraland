"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Eye, EyeOff } from "lucide-react";

export function AuthPanel({ destination, googleError }: { destination: string; googleError?: string }) {
  const router = useRouter();
  const [signup, setSignup] = useState(false);
  const [identifierInput, setIdentifierInput] = useState("");
  const [existingAccount, setExistingAccount] = useState<{ identifier: string; message: string } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [continueTo, setContinueTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetStep, setResetStep] = useState<"closed" | "request" | "verify">("closed");
  const [resetEmail, setResetEmail] = useState("");
  const [resetComplete, setResetComplete] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setExistingAccount(null);
    setBusy(true);

    const values = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, action: signup ? "signup" : "signin" }),
      });
      const result = (await response.json()) as {
        error?: string;
        alreadyExists?: boolean;
        identifier?: string;
        notificationPending?: boolean;
        user?: { role?: string; name?: string; email?: string };
      };

      if (!response.ok) {
        if (result.alreadyExists) {
          setExistingAccount({
            identifier: result.identifier || String(values.phone || values.email || ""),
            message: result.error || "An account with this phone number or email already exists.",
          });
        }
        setError(result.error ?? (signup ? "We couldn't create your account. Please try again." : "We couldn't sign you in. Please check your details."));
        return;
      }

      window.dispatchEvent(new Event("terraland:account-changed"));
      const target = result.user?.role === "admin" ? "/admin" : (destination || "/");
      setContinueTo(target);

      if (signup) {
        setSuccess(`Account created! Welcome, ${result.user?.name || "Member"}. Redirecting…`);
      } else {
        setSuccess(`Signed in! Welcome back, ${result.user?.name || "Member"}. Redirecting…`);
      }

      // Automatically navigate to target without trapping user (using window.location.assign ensures clean cookie pickup on mobile)
      setTimeout(() => {
        window.location.assign(target);
      }, 750);
    } catch {
      setError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitPasswordReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const email = String(values.email ?? resetEmail).trim().toLowerCase();
    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetStep === "request" ? { action: "request", email } : { ...values, action: "reset", email: resetEmail }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(result.error ?? "We couldn't complete the password reset. Please try again.");
        return;
      }
      if (resetStep === "request") {
        setResetEmail(email);
        setResetStep("verify");
        setSuccess(result.message ?? "If an account exists for that email, a reset code has been sent.");
      } else {
        setResetComplete(true);
        setSuccess(result.message ?? "Your password has been changed. Sign in with your new password.");
      }
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const googleErrorMessage =
    googleError === "not_configured"
      ? "Google Sign-In needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET set in your deployment environment variables (Render/Vercel) to work on mobile. Sign in below using your 10-digit mobile number."
      : googleError === "redirect_uri_mismatch"
      ? "Google Sign-In error: Redirect URI mismatch. In Google Cloud Console, please add 'https://nkart.store/api/auth/google' to Authorized Redirect URIs."
      : googleError === "cancelled" || googleError === "access_denied"
      ? "Google sign-in was cancelled."
      : googleError
      ? `Unable to complete Google sign-in (${googleError}). Sign in below using your 10-digit mobile number.`
      : null;

  return (
    <section className="auth-panel">
      <span className="auth-brand" aria-label="NILAY">NILAY<span aria-hidden="true">.</span></span>
      <h2>{signup ? "A new beginning." : "Welcome back."}</h2>
      <p>{signup ? "Create an account to save places and list your land." : "Sign in to manage your listings and enquiries."}</p>

      {resetStep !== "closed" ? (
        <>
          <h3>{resetStep === "request" ? "Reset your password" : "Check your email"}</h3>
          <p>
            {resetStep === "request"
              ? "We’ll email you a one-time code to verify your account."
              : `Enter the six-digit code sent to ${resetEmail}, then choose a new password.`}
          </p>
          {success && (
            <div className="auth-success" role="status">
              <p>{success}</p>
            </div>
          )}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={submitPasswordReset}>
            {resetStep === "request" ? (
              <label>
                <span className="auth-field-label">Email address</span>
                <input name="email" type="email" required autoComplete="email" defaultValue={resetEmail} placeholder="you@example.com" />
              </label>
            ) : (
              <>
                <input type="hidden" name="email" value={resetEmail} />
                <label>
                  <span className="auth-field-label">Verification code</span>
                  <input name="code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="6-digit code" />
                </label>
                <label>
                  <span className="auth-field-label">New password</span>
                  <input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="At least 8 characters" />
                </label>
                <label>
                  <span className="auth-field-label">Confirm new password</span>
                  <input name="confirmPassword" type="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="Enter the new password again" />
                </label>
              </>
            )}
            <button className="button button-dark auth-submit" disabled={busy}>
              {busy ? "One moment…" : resetStep === "request" ? "Send reset code" : "Change password"} <ArrowUpRight size={16} />
            </button>
          </form>
          <div className="auth-switch">
            <button
              type="button"
              onClick={() => {
                setResetStep("closed");
                setError("");
                setSuccess("");
              }}
            >
              Back to sign in
            </button>
            {resetStep === "verify" && (
              <button
                type="button"
                onClick={() => {
                  setResetStep("request");
                  setSuccess("");
                  setError("");
                }}
              >
                Use another email
              </button>
            )}
          </div>
        </>
      ) : resetComplete ? (
        <div className="auth-success" role="status">
          <p>{success}</p>
          <button
            className="button button-dark auth-submit"
            onClick={() => {
              setResetComplete(false);
              setSuccess("");
              setError("");
            }}
          >
            Back to sign in <ArrowUpRight size={16} />
          </button>
        </div>
      ) : success ? (
        <div className="auth-success auth-redirect-success" role="status" aria-live="polite">
          <div className="auth-redirect-loader">
            <div className="auth-loader-scene" aria-hidden="true">
              <svg viewBox="0 0 64 64" fill="none">
                <path className="loader-land" d="M7 51.5 57 51.5" />
                <path className="loader-house" d="m15 30 17-14 17 14v20H15V30Z" />
                <path className="loader-roof" d="m10 31 22-18 22 18" />
                <path className="loader-door" d="M27 50V37h10v13" />
                <path className="loader-window" d="M19 34h6v6h-6zM39 34h6v6h-6z" />
              </svg>
              <span className="loader-site-pin" />
            </div>
            <div className="auth-redirect-copy">
              <span>ACCOUNT READY</span>
              <strong>Finding your place</strong>
              <div className="auth-redirect-progress" aria-hidden="true"><i /></div>
            </div>
          </div>
          <button className="button button-dark auth-submit" onClick={() => router.push(continueTo || "/")}>
            Continue <ArrowUpRight size={16} />
          </button>
        </div>
      ) : (
        <>
          {googleErrorMessage && (
            <div className="form-error" role="alert">
              {googleErrorMessage}
            </div>
          )}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          {existingAccount && (
            <div
              className="auth-exists-card"
              style={{
                background: "rgba(137, 157, 117, 0.12)",
                border: "1px solid rgba(137, 157, 117, 0.35)",
                padding: "12px 14px",
                borderRadius: "6px",
                marginBottom: "14px",
              }}
            >
              <p style={{ margin: "0 0 10px", fontSize: "11px", color: "var(--ink)", lineHeight: 1.5 }}>
                {existingAccount.message}
              </p>
              <button
                type="button"
                className="button button-dark"
                style={{ width: "100%", justifyContent: "space-between", minHeight: "38px", fontSize: "11px" }}
                onClick={() => {
                  setSignup(false);
                  setIdentifierInput(existingAccount.identifier);
                  setExistingAccount(null);
                  setError("");
                }}
              >
                <span>Sign in with {existingAccount.identifier || "this account"}</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          )}

          <a className={`google-signin-button${googleBusy ? " is-loading" : ""}`} href={`/api/auth/google?next=${encodeURIComponent(destination)}`} aria-busy={googleBusy} onClick={(event) => {
            if (googleBusy) { event.preventDefault(); return; }
            event.preventDefault();
            const href = event.currentTarget.href;
            setGoogleBusy(true);
            window.setTimeout(() => window.location.assign(href), 220);
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
            </svg>
            <span className="google-btn-text">{googleBusy ? "Connecting to Google…" : "Continue with Google"}</span>
          </a>

          <div className="auth-divider">
            <span>{signup ? "Register with your phone" : "Sign in with phone or email"}</span>
          </div>

          <form onSubmit={submit}>
            {signup && (
              <label>
                <span className="auth-field-label">Your name</span>
                <input name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="How should we address you?" />
              </label>
            )}

            {signup ? (
              <>
                <label>
                  <span className="auth-field-label">Mobile number</span>
                  <div className="phone-input-wrap">
                    <span className="phone-input-prefix">+91</span>
                    <input
                      name="phone"
                      type="tel"
                      required
                      autoComplete="tel-national"
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      placeholder="98765 43210"
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        const clean = (val.startsWith("91") && val.length > 10) ? val.slice(2) : val;
                        e.target.value = clean.slice(0, 10);
                      }}
                    />
                  </div>
                  <small className="auth-field-hint">
                    Enter your 10-digit mobile number (country code +91 is added automatically).
                  </small>
                </label>
                <label>
                  <span className="auth-field-label">
                    Email address <span className="optional-label">optional, for password recovery</span>
                  </span>
                  <input name="email" type="email" autoComplete="email" placeholder="you@example.com" />
                </label>
              </>
            ) : (
              <label>
                <span className="auth-field-label">10-digit mobile number or email address</span>
                <input
                  name="identifier"
                  type="text"
                  required
                  autoComplete="username"
                  value={identifierInput}
                  onChange={(e) => setIdentifierInput(e.target.value)}
                  placeholder="e.g. 9876543210 or pavansai580@gmail.com"
                />
              </label>
            )}

            <label>
              <span className="auth-field-label">Password</span>
              <span className="password-input-wrap">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  maxLength={72}
                  autoComplete={signup ? "new-password" : "current-password"}
                  placeholder={signup ? "At least 8 characters" : "Enter your password"}
                />
                <button
                  type="button"
                  className="password-visibility"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  <span>{showPassword ? "Hide" : "Show"}</span>
                </button>
              </span>
            </label>

            <button className="button button-dark auth-submit" disabled={busy}>
              {busy ? "One moment…" : signup ? "Create your account" : "Sign in"} <ArrowUpRight size={16} />
            </button>
          </form>

          {!signup && (
            <div className="auth-switch">
              <button
                type="button"
                onClick={() => {
                  setResetStep("request");
                  setSuccess("");
                  setError("");
                  setResetComplete(false);
                }}
              >
                Forgot password?
              </button>
            </div>
          )}
        </>
      )}

      <div className="auth-switch">
        {signup ? "Already have an account?" : "New to NILAY?"}{" "}
        <button
          onClick={() => {
            setSignup(!signup);
            setError("");
            setSuccess("");
            setExistingAccount(null);
            setResetComplete(false);
          }}
        >
          {signup ? "Sign in" : "Create an account"}
        </button>
      </div>

    </section>
  );
}
