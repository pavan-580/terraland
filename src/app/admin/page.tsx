import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { AdminDashboard } from "@/components/admin-dashboard";
import { LogoutButton } from "@/components/logout-button";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = {
  title: "Site administration",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await currentUser();
  if (user?.role !== "admin") redirect("/sign-in?next=%2Fadmin");
  return (
    <main className="admin-page">
      <header className="admin-heading">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/" className="brand" aria-label="NILAY Home">
            <BrandLogo />
          </Link>
        </div>
        <div className="admin-header-actions">
          <span>Signed in as {user.email}</span>
          <Link href="/admin/lenders" className="admin-pill-link">Lender interests</Link>
          <LogoutButton />
        </div>
      </header>
      <section className="admin-intro">
        <span className="eyebrow">SITE CONTROL</span>
        <h1>Administrator dashboard</h1>
        <p>Manage listings, promotions, rolling banners, and buyer enquiries.</p>
      </section>
      <AdminDashboard />
    </main>
  );
}
