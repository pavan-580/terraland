import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, FileCheck2, Landmark, MapPinned, ReceiptText, Scale } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BackButton } from "@/components/back-button";

export const metadata: Metadata = { title: "Land buyer services", description: "NILAY land-record, document due-diligence and property cost tools for buyers in Telangana and across India.", alternates: { canonical: "/services" }, openGraph: { title: "Land buyer services", description: "Land-record, document due-diligence and property cost tools for buyers in Telangana." } };
const services = [
  { href: "/services/dharani-title-check", icon: MapPinned, name: "Dharani / Bhu Bharati land-record check", text: "A practical checklist for checking Telangana land records on the current official portal." },
  { href: "/services/legal-verification", icon: Scale, name: "Legal verification guide", text: "Documents and questions to take to an independent property lawyer before you buy." },
  { href: "/services/ec-verification", icon: FileCheck2, name: "Encumbrance Certificate guide", text: "Learn what an EC search can show, how to request one, and what it cannot prove." },
  { href: "/services/stamp-duty-calculator", icon: ReceiptText, name: "Stamp duty & registration", text: "Open Telangana’s official registration charge calculator for a current estimate." },
  { href: "/services/plot-loan-emi-calculator", icon: Landmark, name: "Plot loan EMI calculator", text: "Estimate monthly repayments from a loan amount, rate, and term." },
];
export default function ServicesPage() {
  return <><SiteHeader /><main className="services-page">
    <div className="services-intro"><BackButton className="back-link" fallbackHref="/" label="Back to home" /><span className="eyebrow">NILAY BUYER TOOLKIT</span><h1>Make your next move<br /><em>with more clarity.</em></h1><p>Useful starting points for checking land records, planning costs, and asking the right questions. These tools support your own due diligence; they are not legal, financial, or title certification.</p></div>
    <div className="service-grid">{services.map(({ href, icon: Icon, name, text }) => <Link className="service-tile" href={href} key={href}><span className="service-icon"><Icon size={20} /></span><h2>{name}</h2><p>{text}</p><span className="service-cta">Open service <ArrowUpRight size={15} /></span></Link>)}</div>
    <p className="service-note">Property rules, records, and fees can change. Always confirm current details with the relevant government office and an independent local professional.</p>
  </main><SiteFooter /></>;
}
