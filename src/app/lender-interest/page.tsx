import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LenderInterestForm } from "@/components/lender-interest-form";
import { BackButton } from "@/components/back-button";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Become a lender",
  description: "Register your interest in discussing property financing opportunities with NILAY.",
};

export default async function LenderInterestPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=%2Flender-interest");

  return <>
    <SiteHeader />
    <main className="content-page lender-interest-page">
      <BackButton className="back-link" fallbackHref="/" label="Back to home" />
      <span className="eyebrow">FINANCING PARTNERSHIPS</span>
      <h1>Become a <em>lending partner.</em></h1>
      <p className="lender-interest-intro">Register your interest and tell NILAY how much you may be able to lend. Our team will contact you directly.</p>
      <LenderInterestForm />
      <p className="lender-interest-disclaimer">This form only records your interest. It does not create a loan, lender-borrower match, or promise of returns. Lending and any matching service may require an appropriately regulated partner.</p>
    </main>
    <SiteFooter />
  </>;
}
