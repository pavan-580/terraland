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
    // ONLY appear on the home screen ("/") — remain any other page that popup no need to show
    if (pathname !== "/") return;

    let active = true;
    let timer = 0;

    void fetch("/api/promotion-popup", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as PromotionSettings | null;
      })
      .then((result) => {
        if (!active || !result?.ad) return;

        setListing(result.ad);

        // Appears on home screen after exactly 5 seconds, and on every refresh in home page
        timer = window.setTimeout(() => {
          if (!active) return;
          setOpen(true);
        }, 5000);
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
    setOpen(false);
  }

  if (!open || !listing || pathname !== "/") return null;

  const destinationHref = listing.id ? `/properties/${encodeURIComponent(listing.id)}` : "/search";

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
          {/* Corner Close Button */}
          <button
            type="button"
            className="promotion-popup-card-close"
            aria-label="Close announcement"
            title="Close"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleDismiss();
            }}
          >
            <X size={18} strokeWidth={2.5} />
          </button>

          {/* Clicking the popup navigates directly to the listing */}
          <Link
            href={destinationHref}
            className="promotion-popup-card-inner"
            aria-label={`View listing: ${listing.heading || listing.title}`}
            onClick={() => setOpen(false)}
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
                {(listing.body ||
                  `${[listing.locality, listing.city].filter(Boolean).join(", ")} · ${formatPrice(listing.price)} · ${new Intl.NumberFormat("en-IN").format(listing.area)} ${listing.unit}`)
                  .replace(/(\+?91[\s-]?)?[6-9]\d{9}\b/g, "")
                  .trim()}
              </p>
              <div className="promotion-popup-details">
                <strong>{listing.price ? formatPrice(listing.price) : "Special Opportunity"}</strong>
                <span>{[listing.locality, listing.city].filter(Boolean).join(" · ")}</span>
              </div>
              <div
                className="promotion-popup-cta"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "var(--lime)",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <span>View Full Listing Details</span>
                <ArrowUpRight size={16} />
              </div>
            </div>
          </Link>
        </article>
      </div>
    </div>
  );
}
