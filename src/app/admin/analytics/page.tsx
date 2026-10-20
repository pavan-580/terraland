import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import { LanguagePicker } from "@/components/language-picker";
import { AdminAnalytics } from "@/components/admin-analytics";
import { BackButton } from "@/components/back-button";

export const metadata: Metadata = { title: "Visitor analytics", robots: { index: false, follow: false } };

export default async function AdminAnalyticsPage() {
  const user = await currentUser();
  if (user?.role !== "admin") redirect("/sign-in?next=%2Fadmin%2Fanalytics");
  return (
    <main className="admin-page">
      <header className="admin-heading">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <BackButton fallbackHref="/admin" label="Back to dashboard" />
          <a href="/" className="brand" aria-label="NILAY Home" style={{ cursor: "pointer", display: "inline-flex" }}>
            <BrandLogo />
          </a>
          <a href="/" className="admin-pill-link" style={{ gap: 6, fontWeight: 700, color: "var(--lime)" }}>
            🏠 Website Home
          </a>
        </div>
        <div>
          <span>Signed in as {user.name}</span>
          <LanguagePicker />
          <a href="/" style={{ fontWeight: 700, color: "var(--lime)" }}>View website</a>
          <LogoutButton />
        </div>
      </header>
      <AdminAnalytics />
    </main>
  );
}
