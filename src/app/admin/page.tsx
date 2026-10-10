import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { AdminDashboard } from "@/components/admin-dashboard";
import { LogoutButton } from "@/components/logout-button";
import { LanguagePicker } from "@/components/language-picker";

export const metadata: Metadata = {
  title: "Site administration",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await currentUser();
  if (user?.role !== "admin") redirect("/sign-in?next=%2Fadmin");
  return <main className="admin-page">
    <header className="admin-heading"><Link href="/" className="brand"><span className="brand-mark">t<span>.</span></span><span className="brand-word">terra<span>land</span></span></Link><div><span>Signed in as {user.email}</span><LanguagePicker /><Link href="/">View website ↗</Link><LogoutButton /></div></header>
    <section className="admin-intro"><span className="eyebrow">SITE CONTROL</span><h1>Administrator dashboard</h1><p>Manage listings, member accounts, and buyer enquiries.</p></section>
    <AdminDashboard />
  </main>;
}
