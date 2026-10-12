"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Check, Eye, EyeOff } from "lucide-react";

export function AuthPanel({ destination, googleError }: { destination: string; googleError?: string }) {
  const router = useRouter();
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [continueTo, setContinueTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetStep, setResetStep] = useState<"closed" | "request" | "verify">("closed");
  const [resetEmail, setResetEmail] = useState("");
  const [resetComplete, setResetComplete] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, action: signup ? "signup" : "signin" }) });
      const result = await response.json() as {
        error?: string;
        notificationPending?: boolean;
        user?: { role?: string; name?: string; email?: string };
      };
      if (!response.ok) {
        setError(result.error ?? "We couldn't sign you in. Please try again.");
        return;
      }
      window.dispatchEvent(new Event("terraland:account-changed"));
      if (signup) {
        setContinueTo(result.user?.role === "admin" ? "/admin" : destination);
        setSuccess(!result.user?.email
          ? "Your account is ready. Sign in with your phone and password. Contact NILAY support if you need password recovery."
          : result.notificationPending
          ? `Your account is ready${result.user?.name ? `, ${result.user.name}` : ""}. You are signed in. The registration email is queued and will be delivered after the site email service is configured.`
          : `Your account is ready${result.user?.name ? `, ${result.user.name}` : ""}. You are signed in, and the registration email has been sent.`);
        return;
      }
      router.push(result.user?.role === "admin" ? "/admin" : destination);
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Please try again.");
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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetStep === "request" ? { action: "request", email } : { ...values, action: "reset", email: resetEmail }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) { setError(result.error ?? "We couldn't complete the password reset. Please try again."); return; }
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
  return <section className="auth-panel"><span className="eyebrow">YOUR NILAY ACCOUNT</span><h2>{signup ? "A new beginning." : "Welcome back."}</h2><p>{signup ? "Create an account to save places and share your land." : "Sign in to pick up where you left off."}</p>
    {resetStep !== "closed" ? <>
      <h3>{resetStep === "request" ? "Reset your password" : "Check your email"}</h3>
      <p>{resetStep === "request" ? "We’ll email you a one-time code to verify your account." : `Enter the six-digit code sent to ${resetEmail}, then choose a new password.`}</p>
      {success && <div className="auth-success" role="status"><p>{success}</p></div>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <form onSubmit={submitPasswordReset}>
        {resetStep === "request" ? <label>Email address<input name="email" type="email" required autoComplete="email" defaultValue={resetEmail} placeholder="you@example.com" /></label> : <>
          <input type="hidden" name="email" value={resetEmail} />
          <label>Verification code<input name="code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="6-digit code" /></label>
          <label>New password<input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="At least 8 characters" /></label>
          <label>Confirm new password<input name="confirmPassword" type="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="Enter the new password again" /></label>
        </>}
        <button className="button button-dark auth-submit" disabled={busy}>{busy ? "One moment…" : resetStep === "request" ? "Send reset code" : "Change password"} <ArrowUpRight size={16} /></button>
      </form>
      <div className="auth-switch"><button type="button" onClick={() => { setResetStep("closed"); setError(""); setSuccess(""); }}>Back to sign in</button>{resetStep === "verify" && <button type="button" onClick={() => { setResetStep("request"); setSuccess(""); setError(""); }}>Use another email</button>}</div>
    </> : resetComplete ? <div className="auth-success" role="status"><p>{success}</p><button className="button button-dark auth-submit" onClick={() => { setResetComplete(false); setSuccess(""); setError(""); }}>Back to sign in <ArrowUpRight size={16} /></button></div> : success ? <div className="auth-success" role="status"><p>{success}</p><button className="button button-dark auth-submit" onClick={() => router.push(continueTo)}>Continue <ArrowUpRight size={16} /></button></div> : <>
      {googleError && <div className="form-error" role="alert">{googleError}</div>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <a className="google-signin-button" href={`/api/auth/google?next=${encodeURIComponent(destination)}`}><span aria-hidden="true">G</span> Continue with Google</a>
      <div className="auth-divider"><span>{signup ? "Register with your phone" : "Sign in with phone or email"}</span></div>
      <form onSubmit={submit}>{signup && <label>Your name<input name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="How should we address you?" /></label>}{signup ? <><label>Mobile number with country code<input name="phone" type="tel" required autoComplete="tel" inputMode="tel" pattern="\+[1-9][0-9 ()-]{7,22}" defaultValue="+91 " placeholder="+91 98765 43210" /><small>This will be your sign-in ID. Change +91 to your country code if needed.</small></label><label>Email address <span className="optional-label">optional, for password recovery</span><input name="email" type="email" autoComplete="email" placeholder="you@example.com" /></label></> : <label>Phone number or email address<input name="identifier" type="text" required autoComplete="username" placeholder="+91 98765 43210 or you@example.com" /></label>}<label>Password<span className="password-input-wrap"><input name="password" type={showPassword ? "text" : "password"} required minLength={8} maxLength={72} autoComplete={signup ? "new-password" : "current-password"} placeholder="At least 8 characters" /><button type="button" className="password-visibility" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}<span>{showPassword ? "Hide" : "Show"}</span></button></span></label>
        <button className="button button-dark auth-submit" disabled={busy}>{busy ? "One moment…" : signup ? "Create your account" : "Sign in"} <ArrowUpRight size={16} /></button>
      </form>
      {!signup && <div className="auth-switch"><button type="button" onClick={() => { setResetStep("request"); setSuccess(""); setError(""); setResetComplete(false); }}>Forgot password?</button></div>}
    </>}<div className="auth-switch">{signup ? "Already have an account?" : "New to NILAY?"} <button onClick={() => { setSignup(!signup); setError(""); setSuccess(""); setResetComplete(false); }}>{signup ? "Sign in" : "Create an account"}</button></div>
    <div className="auth-reassurance"><Check size={14} /> Your account details stay private.</div><Link href="/" className="text-link auth-home">Explore without an account <ArrowUpRight size={14} /></Link>
  </section>;
}
