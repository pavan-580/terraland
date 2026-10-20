import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import { LanguagePicker } from "@/components/language-picker";
import { BackButton } from "@/components/back-button";
import { LenderInterestList, type LenderInterestRow } from "@/components/lender-interest-list";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Lender interests", robots: { index: false, follow: false } };

export default async function AdminLendersPage() {
  const user = await currentUser();
  if (user?.role !== "admin") redirect("/sign-in?next=%2Fadmin%2Flenders");
  const leads = db.prepare("SELECT id, name, email, phone, amount, message, notificationStatus, notificationError, createdAt FROM lender_interests ORDER BY createdAt DESC").all() as LenderInterestRow[];

  return (
    <main className="admin-page">
      <header className="admin-heading">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <BackButton fallbackHref="/admin" label="Back to dashboard" />
          <a href="/" className="brand" aria-label="NILAY Home" style={{ cursor: "pointer", display: "inline-flex" }}>
            <BrandLogo />
          </a>
        </div>
        <div>
          <span>Signed in as {user.email}</span>
          <LanguagePicker />
          <a href="/" style={{ fontWeight: 700, color: "var(--lime)" }}>View website</a>
          <LogoutButton />
        </div>
      </header>
      <section className="admin-intro">
        <span className="eyebrow">PRIVATE ADMIN RECORDS</span>
        <h1>Lender interests</h1>
        <p>Contact people who registered interest in potential financing partnerships. Their details are private.</p>
      </section>
      <section className="admin-content lender-admin-content">
        <LenderInterestList leads={leads} />
      </section>
    </main>
  );
}
