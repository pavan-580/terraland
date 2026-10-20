"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, X } from "lucide-react";

type PopupListing = { id: string; title: string; city: string; locality: string; price: number; area: number; unit: string; image: string; kicker: string; heading: string; date: string; body: string };
type PromotionSettings = { ad?: PopupListing | null; announcement?: { enabled: boolean; text: string } };

function formatPrice(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(value % 10000000 ? 2 : 0)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(value % 100000 ? 1 : 0)} Lakhs`;
  return `₹${new Intl.NumberFormat("en-IN").format(value)}`;
}

export function PromotionPopup() {
  const pathname = usePathname();
  const [listing, setListing] = useState<PopupListing | null>(null);
  const [open, setOpen] = useState(false);
  const [ticker, setTicker] = useState("");

  useEffect(() => {
    setOpen(false);
    setTicker("");
    if (pathname.startsWith("/admin")) return;

    let active = true;
    let timer = 0;
    const openedAt = Date.now();
    void fetch("/api/promotion-popup", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as PromotionSettings | null;
      })
      .then((result) => {
        if (!active || !result) return;
        if (result.announcement?.enabled && result.announcement.text.trim()) setTicker(result.announcement.text.trim());
        if (!result.ad) return;
        setListing(result.ad);
        try {
          if (window.sessionStorage.getItem("nilay-listing-popup-shown") === "true") return;
        } catch { /* Continue without session persistence when browser storage is unavailable. */ }
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

  return <>
    {ticker && <div className="site-announcement-ticker" role="status" aria-label="Latest announcement">
      <span className="site-announcement-label"><span aria-hidden="true">⚡</span> LATEST UPDATES</span>
      <div className="site-announcement-window"><div className="site-announcement-track"><span>{ticker}</span><span aria-hidden="true">{ticker}</span></div></div>
    </div>}
    {open && listing && <div className="promotion-popup" role="dialog" aria-modal="true" aria-label={listing.heading || listing.title}>
      <Link className="promotion-popup-link" href={`/properties/${encodeURIComponent(listing.id)}`} aria-label={`View listing: ${listing.title}`}>
        <article className="promotion-popup-card">
          <div className="promotion-popup-tabs"><span>{listing.kicker || "IMPORTANT ANNOUNCEMENT"}</span><span>{listing.date || "Verified listing"}</span></div>
          <img className="promotion-popup-image" src={listing.image} alt={`Announcement: ${listing.heading || listing.title}`} />
          <div className="promotion-popup-copy">
            <span className="eyebrow">{listing.kicker || "IMPORTANT ANNOUNCEMENT"}</span>
            {listing.date && <span className="promotion-popup-date">{listing.date}</span>}
            <h2>{listing.heading || listing.title}</h2>
            <p className="promotion-popup-body">{listing.body || `${[listing.locality, listing.city].filter(Boolean).join(", ")} · ${formatPrice(listing.price)} · ${new Intl.NumberFormat("en-IN").format(listing.area)} ${listing.unit}`}</p>
            <div className="promotion-popup-details"><strong>{formatPrice(listing.price)}</strong><span>{[listing.locality, listing.city].filter(Boolean).join(" · ")}</span></div>
            <span className="promotion-popup-cta">View listing <ArrowUpRight size={16} aria-hidden="true" /></span>
          </div>
        </article>
      </Link>
      <button type="button" className="promotion-popup-close" aria-label="Close announcement" title="Close" onClick={() => setOpen(false)}><X size={20} /></button>
    </div>}
  </>;
}
