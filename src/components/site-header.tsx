"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Heart } from "lucide-react";
import { LanguagePicker } from "@/components/language-picker";
import { BrandLogo } from "@/components/brand-logo";
import { BackButton } from "@/components/back-button";

type HeaderUser = { name: string; email: string; role: "user" | "admin" };

export function SiteHeader({ variant = "standard", mobileLogoOnly = false }: { variant?: "standard" | "hero"; mobileLogoOnly?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [logoutError, setLogoutError] = useState("");
  const [farmstayIndex, setFarmstayIndex] = useState(0);
  const [farmstayPaused, setFarmstayPaused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const farmstayHref = "/search?category=rent";
  useEffect(() => {
    if (farmstayPaused) return;
    const timer = window.setInterval(() => setFarmstayIndex((index) => (index + 1) % 2), 3000);
    return () => window.clearInterval(timer);
  }, [farmstayPaused]);
  useEffect(() => {
    function handleScroll() { setHeaderScrolled(window.scrollY > 8); }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => {
    let active = true;
    void fetch("/api/auth")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load the signed-in account.");
        return await response.json() as { user: HeaderUser | null };
      })
      .then((result) => { if (active) setUser(result.user); })
      .catch((error: unknown) => console.error("Unable to load the account name for the site header:", error));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function refreshAccount() {
      void fetch("/api/auth")
        .then(async (response) => {
          if (!response.ok) throw new Error("Could not refresh the signed-in account.");
          return await response.json() as { user: HeaderUser | null };
        })
        .then((result) => setUser(result.user))
        .catch((error: unknown) => console.error("Unable to refresh the site header account:", error));
    }
    window.addEventListener("terraland:account-changed", refreshAccount);
    return () => window.removeEventListener("terraland:account-changed", refreshAccount);
  }, []);

  async function logout() {
    setLogoutError("");
    try {
      const response = await fetch("/api/auth", { method: "DELETE" });
      if (!response.ok) throw new Error("Sign out failed. Please try again.");
      setUser(null);
      window.dispatchEvent(new Event("terraland:account-changed"));
      router.refresh();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Sign out failed. Please try again.");
    }
  }

  return (
      <header className={`site-header${variant === "hero" ? " site-header-hero" : ""}${mobileLogoOnly ? " mobile-logo-only" : ""}${headerScrolled ? " is-scrolled" : ""}`} translate="yes">
      <div className="header-inner">
        {pathname !== "/" && pathname !== "/sell" && <BackButton className="header-back-button" />}
        <Link className="brand" href="/" aria-label="NILAY Real Estate home">
          <BrandLogo />
        </Link>
        <button className="mobile-menu-toggle" type="button" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen}>
          <span className={`mobile-menu-icon${mobileMenuOpen ? " is-open" : ""}`} aria-hidden="true"><span /><span /><span /></span>
        </button>
        {mobileMenuOpen && <button className="mobile-menu-backdrop" type="button" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} />}
        <nav className={`main-nav${mobileMenuOpen ? " is-open" : ""}`} aria-label="Main navigation">
          <Link href="/search?category=sale">Explore land</Link>
          <div className="farmstay-nav-window" onPointerEnter={() => setFarmstayPaused(true)}
            onPointerLeave={() => setFarmstayPaused(false)} onFocusCapture={() => setFarmstayPaused(true)}
            onBlurCapture={(event) => {
              if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setFarmstayPaused(false);
            }}>
            <div className="farmstay-nav-roll">
              <button key={farmstayIndex} className="farmstay-nav-link" type="button"
                onClick={() => {
                  setFarmstayPaused(true);
                  router.push(farmstayHref);
                }}
                aria-label="Browse all rental listings">
                <span className="farmstay-nav-label">{farmstayIndex === 0 ? "Farm house" : "Resort"}</span>
              </button>
            </div>
          </div>
          <Link href="/my-listings">My listings</Link>
          <Link href="/about">How it works</Link>
          <Link href="/lender-interest">Become a lender</Link>
          <Link className="mobile-menu-favorites" href="/saved"><Heart size={17} /> Favorites</Link>
          <details className="services-nav">
            <summary className="services-nav-trigger">Services</summary>
            <div className="services-nav-menu">
              <Link href="/services">All services</Link>
              <Link href="/services/dharani-title-check">Dharani / Bhu Bharati check</Link>
              <Link href="/services/legal-verification">Legal verification guide</Link>
              <Link href="/services/ec-verification">Encumbrance certificate</Link>
              <Link href="/services/stamp-duty-calculator">Stamp duty calculator</Link>
              <Link href="/services/plot-loan-emi-calculator">Plot loan EMI calculator</Link>
            </div>
          </details>
          <LanguagePicker />
          <div className="mobile-menu-account">
            {user ? <Link className="sign-in-link account-name" href={user.role === "admin" ? "/admin" : "/profile"}>{user.role === "admin" ? "Admin" : user.name}</Link> : <Link className="sign-in-link" href="/sign-in">Sign in</Link>}
            {user && <button className="logout-button" type="button" onClick={() => void logout()}>Sign out</button>}
            <Link className="button button-dark button-small" href="/sell">List your land for free <ArrowUpRight size={15} /></Link>
          </div>
        </nav>
        <div className="header-actions">
          <Link className="saved-link" href="/saved" aria-label="Saved listings"><Heart size={17} /></Link>
          {user ? <>
            <Link className="sign-in-link account-name" href={user.role === "admin" ? "/admin" : "/profile"}>{user.role === "admin" ? "Admin" : user.name}</Link>
            <button className="logout-button" type="button" onClick={() => void logout()}>Sign out</button>
          </> : <Link className="sign-in-link" href="/sign-in">Sign in</Link>}
          <Link className="button button-dark button-small header-listing-cta" href="/sell" aria-label="List your land for free" title="List your land for free"><span>List your land for free</span><ArrowUpRight size={15} /></Link>
        </div>
        {logoutError && <span className="header-auth-error" role="alert">{logoutError}</span>}
      </div>
    </header>
  );
}
