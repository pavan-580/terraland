import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth-panel";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = { title: "Your NILAY account" };

const googleErrors: Record<string, string> = {
  not_configured: "Google sign-in is awaiting GOOGLE_CLIENT_ID setup. You can also sign in directly below.",
  cancelled: "Google sign-in was cancelled.",
  invalid_state: "Google sign-in session expired. Please try again.",
  failed: "Google sign-in could not be completed. Please try again.",
  unverified_email: "Google did not provide a verified email address.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; googleError?: string }> }) {
  const { next, googleError } = await searchParams;
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  return <><SiteHeader mobileLogoOnly /><main className="auth-page"><div className="auth-picture"><div className="auth-picture-copy"><span className="eyebrow">A PLACE THAT FEELS LIKE YOURS</span><h1>Better things<br />start with <em>good ground.</em></h1><p>Save places, make connections, and keep your next move close at hand.</p></div><span className="auth-coordinates">17°22&apos;N · 78°29&apos;E</span></div><AuthPanel destination={destination} googleError={googleError ? googleErrors[googleError] ?? googleErrors.failed : undefined} /></main><SiteFooter /></>;
}
