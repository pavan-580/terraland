"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Heart, MapPin } from "lucide-react";
import { LanguagePicker } from "@/components/language-picker";

type HeaderUser = { name: string; email: string; role: "user" | "admin" };

export function SiteHeader({ variant = "standard", keepVisible = false, mobileLogoOnly = false }: { variant?: "standard" | "hero"; keepVisible?: boolean; mobileLogoOnly?: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [logoutError, setLogoutError] = useState("");
  const [farmstayIndex, setFarmstayIndex] = useState(0);
  const [farmstayPaused, setFarmstayPaused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [heroPassed, setHeroPassed] = useState(false);
  const farmstayHref = "/search?category=rent";
  useEffect(() => {
    if (farmstayPaused) return;
    const timer = window.setInterval(() => setFarmstayIndex((index) => (index + 1) % 2), 3000);
    return () => window.clearInterval(timer);
  }, [farmstayPaused]);
  useEffect(() => {
    let previousY = window.scrollY;
    let direction = 0;
    let directionDistance = 0;
    setHeaderScrolled(previousY > 24);
    if (variant === "hero") setHeroPassed(previousY >= window.innerHeight - 78);
    function handleScroll() {
      const currentY = window.scrollY;
      setHeaderScrolled(currentY > 24);
      if (variant === "hero") setHeroPassed(currentY >= window.innerHeight - 78);
      if (keepVisible) {
        setHeaderHidden(false);
        previousY = currentY;
        return;
      }
      const delta = currentY - previousY;
      const nextDirection = Math.sign(delta);
      if (nextDirection !== 0) {
        directionDistance = nextDirection === direction ? directionDistance + Math.abs(delta) : Math.abs(delta);
        direction = nextDirection;
      }
      if (mobileMenuOpen || currentY < 80) {
        setHeaderHidden(false);
        directionDistance = 0;
      } else {
        if (direction === 1 && directionDistance >= 14 && currentY > 120) {
          setHeaderHidden(true);
          directionDistance = 0;
        } else if (direction === -1 && directionDistance >= 8) {
          setHeaderHidden(false);
          directionDistance = 0;
        }
      }
      previousY = currentY;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [keepVisible, mobileMenuOpen, variant]);
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
      <header className={`site-header${variant === "hero" ? " site-header-hero" : ""}${mobileLogoOnly ? " mobile-logo-only" : ""}${headerHidden && !mobileMenuOpen && !keepVisible ? " is-scroll-hidden" : ""}${headerScrolled ? " is-scrolled" : ""}${heroPassed ? " is-past-hero" : ""}`} translate="yes">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="Terra home">
          <span className="brand-mark">t<span>.</span></span>
          <span className="brand-word">terra<span>land</span></span>
        </Link>
        <div className="header-location"><MapPin size={15} /> Land &amp; plots across India</div>
        <button className="mobile-menu-toggle" type="button" onClick={() => { setHeaderHidden(false); setMobileMenuOpen((open) => !open); }} aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen}>
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
          <a href="https://wa.me/918074399963?text=Hello%20Terraland%2C%20I%20need%20help." target="_blank" rel="noopener noreferrer" aria-label="Get help on WhatsApp">Help</a>
          <LanguagePicker />
          <div className="mobile-menu-account">
            {user ? <Link className="sign-in-link account-name" href={user.role === "admin" ? "/admin" : "/my-listings"}>{user.role === "admin" ? "Admin" : user.name}</Link> : <Link className="sign-in-link" href="/sign-in">Sign in</Link>}
            {user && <button className="logout-button" type="button" onClick={() => void logout()}>Sign out</button>}
            <Link className="button button-dark button-small" href="/sell">List your land for free <ArrowUpRight size={15} /></Link>
          </div>
        </nav>
        <div className="header-actions">
          <Link className="saved-link" href="/saved" aria-label="Saved listings"><Heart size={17} /></Link>
          {user ? <>
            <Link className="sign-in-link account-name" href={user.role === "admin" ? "/admin" : "/my-listings"}>{user.role === "admin" ? "Admin" : user.name}</Link>
            <button className="logout-button" type="button" onClick={() => void logout()}>Sign out</button>
          </> : <Link className="sign-in-link" href="/sign-in">Sign in</Link>}
          <Link className="button button-dark button-small header-listing-cta" href="/sell" aria-label="List your land for free" title="List your land for free"><span>List your land for free</span><ArrowUpRight size={15} /></Link>
        </div>
        {logoutError && <span className="header-auth-error" role="alert">{logoutError}</span>}
      </div>
    </header>
  );
}
