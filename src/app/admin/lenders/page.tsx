import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LanguagePicker } from "@/components/language-picker";
import { LogoutButton } from "@/components/logout-button";
import { currentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { LenderInterestList } from "@/components/lender-interest-list";
import { BackButton } from "@/components/back-button";

export const metadata: Metadata = {
  title: "Lender interest leads",
  robots: { index: false, follow: false },
};

type LenderInterestRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  amount: number;
  message: string;
  notificationStatus: string;
  notificationError: string | null;
  createdAt: string;
};

export default async function AdminLendersPage() {
  const user = await currentUser();
  if (user?.role !== "admin") redirect("/sign-in?next=%2Fadmin%2Flenders");
  const leads = db.prepare("SELECT id, name, email, phone, amount, message, notificationStatus, notificationError, createdAt FROM lender_interests ORDER BY createdAt DESC").all() as LenderInterestRow[];

  return <main className="admin-page">
    <header className="admin-heading"><div style={{ display: "flex", alignItems: "center", gap: "12px" }}><BackButton fallbackHref="/admin" label="Back to dashboard" /><Link href="/" className="brand" aria-label="Terraland Real Estate home"><BrandLogo /></Link></div><div><span>Signed in as {user.email}</span><LanguagePicker /><Link href="/">View website</Link><LogoutButton /></div></header>
    <section className="admin-intro"><span className="eyebrow">PRIVATE ADMIN RECORDS</span><h1>Lender interests</h1><p>Contact people who registered interest in potential financing partnerships. Their details are private.</p></section>
    <section className="admin-content lender-admin-content">
      <LenderInterestList leads={leads} />
    </section>
  </main>;
}

