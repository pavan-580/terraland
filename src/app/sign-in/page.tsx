import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth-panel";

export const metadata: Metadata = { title: "Your NILAY account", robots: { index: false, follow: false } };

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
  return <main className="sign-in-page-shell"><AuthPanel destination={destination} googleError={googleError ? googleErrors[googleError] ?? googleErrors.failed : undefined} /></main>;
}
