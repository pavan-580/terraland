import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth-panel";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = { title: "Your Terraland account" };

const googleErrors: Record<string, string> = {
  not_configured: "Google sign-in is not configured yet. Please use email sign-in or try again later.",
  cancelled: "Google sign-in was cancelled.",
  invalid_state: "Google sign-in expired. Please try again.",
  failed: "Google sign-in could not be completed. Please try again.",
  unverified_email: "Google did not provide a verified email address.",
  admin_not_allowed: "Use the administrator email and password to access the admin account.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; googleError?: string }> }) {
  const { next, googleError } = await searchParams;
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  return <><SiteHeader /><main className="auth-page"><div className="auth-picture"><div className="auth-picture-copy"><span className="eyebrow">A PLACE THAT FEELS LIKE YOURS</span><h1>Better things<br />start with <em>good ground.</em></h1><p>Save places, make connections, and keep your next move close at hand.</p></div><span className="auth-coordinates">17°22&apos;N · 78°29&apos;E</span></div><AuthPanel destination={destination} googleError={googleError ? googleErrors[googleError] ?? googleErrors.failed : undefined} /></main><SiteFooter /></>;
}
