import type { Metadata } from "next";
import Link from "next/link";
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
  return <main className="admin-page"><header className="admin-heading"><div style={{ display: "flex", alignItems: "center", gap: "12px" }}><BackButton fallbackHref="/admin" label="Back to dashboard" /><Link href="/" className="brand" aria-label="Terraland home"><BrandLogo /></Link></div><div><span>Signed in as {user.name}</span><LanguagePicker /><Link href="/">View website</Link><LogoutButton /></div></header><AdminAnalytics /></main>;
}
