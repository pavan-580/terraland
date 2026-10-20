"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, X } from "lucide-react";

type PopupListing = { id: string; title: string; city: string; locality: string; price: number; area: number; unit: string; image: string };

function formatPrice(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(value % 10000000 ? 2 : 0)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(value % 100000 ? 1 : 0)} Lakhs`;
  return `₹${new Intl.NumberFormat("en-IN").format(value)}`;
}

export function PromotionPopup() {
  const pathname = usePathname();
  const [listing, setListing] = useState<PopupListing | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    if (pathname.startsWith("/admin")) return;

    let active = true;
    let timer = 0;
    const openedAt = Date.now();
    try {
      if (window.sessionStorage.getItem("nilay-listing-popup-shown") === "true") return;
    } catch {
      // Continue without session persistence when browser storage is unavailable.
    }

    void fetch("/api/promotion-popup", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as { ad?: PopupListing | null };
      })
      .then((result) => {
        if (!active || !result?.ad) return;
        setListing(result.ad);
        const delay = Math.max(0, 5000 - (Date.now() - openedAt));
        timer = window.setTimeout(() => {
          if (!active) return;
          try { window.sessionStorage.setItem("nilay-listing-popup-shown", "true"); } catch { /* Storage may be disabled. */ }
          setOpen(true);
        }, delay);
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!open || !listing) return null;

  return <div className="promotion-popup" role="dialog" aria-modal="true" aria-label="Featured residential plot">
    <Link className="promotion-popup-link" href={`/properties/${encodeURIComponent(listing.id)}`} aria-label={`View listing: ${listing.title}`}>
      <article className="promotion-popup-card">
        <img className="promotion-popup-image" src={listing.image} alt={`Featured plot in ${listing.locality || listing.city}`} />
        <div className="promotion-popup-copy">
          <span className="eyebrow">NEW VERIFIED LISTING</span>
          <h2>{listing.title}</h2>
          <p>{[listing.locality, listing.city].filter(Boolean).join(", ")}</p>
          <div className="promotion-popup-details">
            <strong>{formatPrice(listing.price)}</strong>
            <span>{new Intl.NumberFormat("en-IN").format(listing.area)} {listing.unit}</span>
          </div>
          <span className="promotion-popup-cta">View plot <ArrowUpRight size={16} aria-hidden="true" /></span>
        </div>
      </article>
    </Link>
    <button type="button" className="promotion-popup-close" aria-label="Close listing popup" title="Close" onClick={() => setOpen(false)}><X size={20} /></button>
  </div>;
}
