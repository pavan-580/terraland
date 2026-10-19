"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ChevronDown, Heart, Menu, X } from "lucide-react";
import { LanguagePicker } from "@/components/language-picker";
import { BrandLogo } from "@/components/brand-logo";

type HeaderUser = { name: string; email: string; role: "user" | "admin" };

export function SiteHeader({ variant = "standard", mobileLogoOnly = false }: { variant?: "standard" | "hero"; mobileLogoOnly?: boolean }) {
  const router = useRouter();
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
    if (!mobileMenuOpen) return;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMenuOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);
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
        <Link className="brand" href="/" aria-label="NILAY Real Estate home">
          <BrandLogo />
        </Link>
        <button className="mobile-menu-toggle" type="button" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen} aria-controls="site-mobile-navigation">
          {mobileMenuOpen ? <X size={25} strokeWidth={2} aria-hidden="true" /> : <Menu size={25} strokeWidth={2} aria-hidden="true" />}
        </button>
        {mobileMenuOpen && <button className="mobile-menu-backdrop" type="button" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} />}
        <nav id="site-mobile-navigation" className={`main-nav${mobileMenuOpen ? " is-open" : ""}`} aria-label="Main navigation" onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setMobileMenuOpen(false);
        }}>
          <div className="mobile-drawer-header">
            <div className="mobile-drawer-brand">
              <strong>NILAY</strong>
            </div>
            <button
              type="button"
              className="mobile-drawer-close"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
          <Link href="/search?category=sale">Explore plots</Link>
          <Link href="/requirements">Buyer Requirements</Link>
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
          <Link href="/lender-interest" className="nav-item-secondary">Become a lender</Link>
          <Link className="mobile-menu-favorites" href="/saved">Favorites <span className="mobile-favorites-heart"><Heart size={16} /></span></Link>
          <details className="services-nav">
            <summary className="services-nav-trigger">
              <span>Services</span>
              <ChevronDown size={14} aria-hidden="true" className="services-chevron" />
            </summary>
            <div className="services-nav-menu">
              <Link href="/services">All services</Link>
              <Link href="/lender-interest">Become a lender</Link>
              <Link href="/services/dharani-title-check">Dharani / Bhu Bharati check</Link>
              <Link href="/services/legal-verification">Legal verification guide</Link>
              <Link href="/services/ec-verification">Encumbrance certificate</Link>
              <Link href="/services/stamp-duty-calculator">Stamp duty calculator</Link>
              <Link href="/services/plot-loan-emi-calculator">Plot loan EMI calculator</Link>
            </div>
          </details>

          <div className="mobile-menu-account">
            <div className="mobile-menu-section">
              <span className="mobile-section-label">LANGUAGE / భాష / भाषा</span>
              <LanguagePicker variant="drawer" />
            </div>

            <div className="mobile-menu-section">
              <span className="mobile-section-label">ACCOUNT</span>
              {user ? (
                <div className="mobile-user-profile-card">
                  <div className="mobile-user-profile-left">
                    <div className="mobile-user-avatar">
                      {user.name ? user.name.charAt(0).toUpperCase() : "A"}
                    </div>
                    <div className="mobile-user-profile-meta">
                      <span className="mobile-user-role-badge">
                        {user.role === "admin" ? "ADMINISTRATOR" : "YOUR ACCOUNT"}
                      </span>
                    <Link className="mobile-user-profile-name" href={user.role === "admin" ? "/admin" : "/profile"}>
                      {user.name}<ArrowUpRight size={12} aria-hidden="true" />
                    </Link>
                    </div>
                  </div>
                  <div className="mobile-user-profile-actions">
                    {user.role === "admin" && (
                      <Link href="/admin" className="mobile-user-admin-pill">
                        Admin CRM →
                      </Link>
                    )}
                    {user.role !== "admin" && (
                      <Link href="/profile#my-requirements" className="mobile-user-requirements-link">
                        My requirements <ArrowUpRight size={12} aria-hidden="true" />
                      </Link>
                    )}
                    <button className="mobile-user-logout-pill" type="button" onClick={() => void logout()}>
                      Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <Link className="mobile-auth-card" href="/sign-in">
                  <div className="mobile-auth-card-text">
                    <strong>Sign in / Register</strong>
                    <span>Save favorite plots & manage enquiries</span>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
              )}
            </div>

            <div className="mobile-menu-actions">
              <Link className="mobile-menu-cta-primary" href="/sell" title="List your land">
                <span>List your land</span>
                <ArrowUpRight size={13} />
              </Link>
              <a
                className="mobile-menu-cta-whatsapp"
                href="https://wa.me/918074399963?text=Hello%20NILAY%2C%20I%27d%20like%20to%20list%20or%20inquire%20about%20a%20plot."
                target="_blank"
                rel="noreferrer"
                title="Post via WhatsApp"
              >
                <span>Post via WhatsApp</span>
                <ArrowUpRight size={13} />
              </a>
            </div>
          </div>
        </nav>
        <div className="header-actions">
          <LanguagePicker />
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
