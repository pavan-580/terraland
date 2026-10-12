import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import { LanguagePicker } from "@/components/language-picker";
import { AdminAnalytics } from "@/components/admin-analytics";

export const metadata: Metadata = { title: "Visitor analytics", robots: { index: false, follow: false } };

export default async function AdminAnalyticsPage() {
  const user = await currentUser();
  if (user?.role !== "admin") redirect("/sign-in?next=%2Fadmin%2Fanalytics");
  return <main className="admin-page"><header className="admin-heading"><Link href="/" className="brand" aria-label="NILAY home"><BrandLogo /></Link><div><span>Signed in as {user.email}</span><LanguagePicker /><Link href="/admin">Dashboard</Link><Link href="/">View website ↗</Link><LogoutButton /></div></header><AdminAnalytics /></main>;
}
