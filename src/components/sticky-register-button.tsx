import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function StickyRegisterButton() {
  return (
    <div className="hero-register-cta-slot">
      <Link className="hero-register-cta" href="/sell">
        Register your land for free <ArrowUpRight size={15} />
      </Link>
    </div>
  );
}
