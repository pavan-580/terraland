"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, X } from "lucide-react";

type PopupListing = {
  id: string;
  title: string;
  city: string;
  locality: string;
  price: number;
  area: number;
  unit: string;
  image: string;
  kicker: string;
  heading: string;
  date: string;
  body: string;
};
type PromotionSettings = {
  ad?: PopupListing | null;
  announcement?: { enabled: boolean; text: string };
};

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
    if (pathname.startsWith("/admin") || pathname.startsWith("/sign-in")) return;

    let active = true;
    let timer = 0;
    const openedAt = Date.now();

    void fetch("/api/promotion-popup", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as PromotionSettings | null;
      })
      .then((result) => {
        if (!active || !result?.ad) return;

        setListing(result.ad);

        // Check if this specific ad signature was dismissed in this session
        const adSignature = `nilay-ad-dismissed-${result.ad.id}-${result.ad.heading}`;
        try {
          if (window.sessionStorage.getItem(adSignature) === "true") return;
        } catch {
          /* Continue without session persistence when browser storage is unavailable. */
        }

        const delay = Math.max(0, 5000 - (Date.now() - openedAt));
        timer = window.setTimeout(() => {
          if (!active) return;
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

  function handleDismiss() {
    if (listing) {
      const adSignature = `nilay-ad-dismissed-${listing.id}-${listing.heading}`;
      try {
        window.sessionStorage.setItem(adSignature, "true");
      } catch {
        /* storage may be blocked */
      }
    }
    setOpen(false);
  }

  const destinationHref = listing?.id ? `/properties/${encodeURIComponent(listing.id)}` : "/search";

  if (!open || !listing) return null;

  return (
    <div
      className="promotion-popup"
      role="dialog"
      aria-modal="true"
      aria-label={listing.heading || listing.title}
      onClick={handleDismiss}
    >
      <div className="promotion-popup-modal-wrap" onClick={(event) => event.stopPropagation()}>
        <article className="promotion-popup-card">
          {/* Corner Close Button ("wrong mark" X) right on the card corner */}
          <button
            type="button"
            className="promotion-popup-card-close"
            aria-label="Close announcement"
            title="Close"
            onClick={handleDismiss}
          >
            <X size={18} strokeWidth={2.5} />
          </button>

          <Link
            className="promotion-popup-link"
            href={destinationHref}
            aria-label={`View listing: ${listing.title}`}
          >
            <div className="promotion-popup-tabs">
              <span>{listing.kicker || "IMPORTANT ANNOUNCEMENT"}</span>
              <span>{listing.date || "Verified listing"}</span>
            </div>
            <img
              className="promotion-popup-image"
              src={listing.image}
              alt={`Announcement: ${listing.heading || listing.title}`}
            />
            <div className="promotion-popup-copy">
              <span className="eyebrow">{listing.kicker || "IMPORTANT ANNOUNCEMENT"}</span>
              {listing.date && <span className="promotion-popup-date">{listing.date}</span>}
              <h2>{listing.heading || listing.title}</h2>
              <p className="promotion-popup-body">
                {listing.body ||
                  `${[listing.locality, listing.city].filter(Boolean).join(", ")} · ${formatPrice(listing.price)} · ${new Intl.NumberFormat("en-IN").format(listing.area)} ${listing.unit}`}
              </p>
              <div className="promotion-popup-details">
                <strong>{listing.price ? formatPrice(listing.price) : "Special Opportunity"}</strong>
                <span>{[listing.locality, listing.city].filter(Boolean).join(" · ")}</span>
              </div>
              <span className="promotion-popup-cta">
                View listing <ArrowUpRight size={16} aria-hidden="true" />
              </span>
            </div>
          </Link>
        </article>
      </div>
    </div>
  );
}
