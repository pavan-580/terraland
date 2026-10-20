import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Link className="brand brand-light" href="/" aria-label="NILAY Real Estate home">
            <BrandLogo placement="footer" />
          </Link>
          <p>
            The transparent residential land acquisition platform in Miyapur, Hyderabad. We connect genuine buyers and sellers with verified plot titles and physically inspected properties.
          </p>
          <a className="footer-whatsapp-link" href="https://wa.me/918074399963?text=Hello%20NILAY%2C%20I%20would%20like%20to%20inquire%20about%20plots%20in%20Miyapur." target="_blank" rel="noreferrer">
            Connect with NILAY on WhatsApp <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="footer-col">
          <strong>Explore Plots</strong>
          <Link href="/search?category=sale">All residential plots</Link>
          <Link href="/requirements">Register buyer requirement</Link>
          <Link href="/search?category=sale&locality=Miyapur">Miyapur corridor</Link>
          <Link href="/search?category=sale&locality=Bachupally">Bachupally corridor</Link>
          <Link href="/search?category=sale&locality=Ameenpur">Ameenpur corridor</Link>
        </div>
        <div className="footer-col">
          <strong>For Landowners</strong>
          <Link href="/sell">List your plot for verification</Link>
          <Link href="/sign-in">Account &amp; listings</Link>
          <Link href="/about">How verification works</Link>
          <a href="https://wa.me/918074399963?text=Hello%20NILAY%2C%20I%20own%20a%20plot%20in%20Miyapur%20and%20want%20to%20list." target="_blank" rel="noreferrer">
            Seller WhatsApp assistance
          </a>
        </div>
        <div className="footer-col">
          <strong>Due Diligence</strong>
          <Link href="/services">Advisory services</Link>
          <Link href="/services/dharani-title-check">Dharani / Revenue check</Link>
          <Link href="/services/ec-verification">Encumbrance certificate (EC)</Link>
          <Link href="/services/stamp-duty-calculator">Telangana stamp duty</Link>
          <Link href="/services/plot-loan-emi-calculator">Plot loan calculator</Link>
        </div>
        <div className="footer-note">
          <span className="eyebrow">GROUND REALITIES FIRST</span>
          <p>Zero fake listings, zero unverified middlemen. Physical site visits, documented boundaries, and verified revenue records.</p>
          <Link href="/faq">Read buyer &amp; seller FAQs <ArrowUpRight size={14} /></Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 <span className="footer-nilay-word">NILAY</span>. Operating in Miyapur, Hyderabad.</span>
        <div>
          <Link href="/terms">Terms &amp; Disclosures</Link>
          <Link href="/privacy">Privacy Policy</Link>
        </div>
        <span>Built with care for residential plots in Telangana, India</span>
      </div>
    </footer>
  );
}
