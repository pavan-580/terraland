import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Link className="brand brand-light" href="/" aria-label="NILAY Real Estate home"><BrandLogo placement="footer" /></Link>
          <p>A more considered way to find your place on the map. Discover verified land and make your next move with confidence.</p>
          <Link href="/contact">Contact our team <ArrowUpRight size={14} /></Link>
        </div>
        <div className="footer-col"><strong>Explore</strong><Link href="/search?category=sale">Land for sale</Link><Link href="/search?category=sale&type=Residential%20plot">Residential plots</Link><Link href="/search?category=sale&type=Farm%20land">Farm land</Link><Link href="/search?category=sale&type=Agricultural%20land">Agricultural land</Link></div>
        <div className="footer-col"><strong>For owners</strong><Link href="/sell">List your land for free</Link><Link href="/sign-in">Your account</Link><Link href="/about">How it works</Link><Link href="/contact">Get in touch</Link></div>
        <div className="footer-col"><strong>Services</strong><Link href="/services">All services</Link><Link href="/services/dharani-title-check">Land-record check</Link><Link href="/services/ec-verification">EC guide</Link><Link href="/services/stamp-duty-calculator">Stamp duty</Link><Link href="/services/plot-loan-emi-calculator">Plot loan EMI</Link></div>
        <div className="footer-note"><span className="eyebrow">A clearer path to land</span><p>Good decisions begin with good information. We put clarity first, from the first search to the final handshake.</p><Link href="/faq">Read our FAQs <ArrowUpRight size={14} /></Link></div>
      </div>
      <div className="footer-bottom"><span>© 2026 NILAY. Made for better ground.</span><div><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link></div><span>Built with care in Hyderabad, India</span></div>
    </footer>
  );
}
