"use client";

import type { MouseEvent } from "react";
import { formatListingPrice, type Property } from "@/lib/market";

const customerCareNumber = "918074399963";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nkart.store").replace(/\/+$/, "");

export function WhatsAppListingLink({ property, className = "" }: { property: Property; className?: string }) {
  const listingUrl = `${siteUrl}/properties/${encodeURIComponent(property.id)}`;
  const category = property.listingCategory === "rent" ? "For rent" : "For sale";
  const description = property.description.replace(/\s+/g, " ").trim();
  const details = [
    `Hello NILAY, I'm interested in this listing. Please share more details.`,
    `Property: ${property.title}`,
    `Type: ${property.type} (${category})`,
    `Location: ${property.locality}, ${property.city}`,
    `Price: ${formatListingPrice(property)}`,
    `Area: ${property.area} ${property.unit}`,
    property.facing ? `Facing: ${property.facing}` : "",
    property.soilType ? `Soil type: ${property.soilType}` : "",
    property.roadWidth ? `Road width: ${property.roadWidth}` : "",
    property.approvals ? `Approvals: ${property.approvals}` : "",
    property.amenities?.length ? `Amenities: ${property.amenities.join(", ")}` : "",
    description ? `Description: ${description.slice(0, 500)}${description.length > 500 ? "…" : ""}` : "",
    `Listing: ${listingUrl}`,
  ].filter(Boolean).join("\n");
  const whatsappUrl = `https://wa.me/${customerCareNumber}?text=${encodeURIComponent(details)}`;

  function recordClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const payload = JSON.stringify({ propertyId: property.id, contactMethod: "whatsapp" });
    if (!navigator.sendBeacon("/api/seller-phone-clicks", new Blob([payload], { type: "application/json" }))) {
      void fetch("/api/seller-phone-clicks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }
  }

  return <a className={`whatsapp-listing-link ${className}`.trim()} href={whatsappUrl} onClick={recordClick}
    target="_blank" rel="noreferrer" aria-label={`Message NILAY on WhatsApp about ${property.title}`} title="WhatsApp about this listing">
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
      <path d="M20.1 11.6a8.1 8.1 0 0 1-12 7.1L3.5 20l1.3-4.4a8.1 8.1 0 1 1 15.3-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.1 7.6c-.3.3-.6.8-.6 1.4 0 1.8 2.4 4.5 4.2 5.5 1.1.6 2.8 1.4 3.7.2.3-.4.6-1 .5-1.2-.1-.2-1.5-.9-1.8-1-.3-.1-.4-.1-.6.2l-.7.8c-.2.2-.3.2-.7 0-.8-.4-1.8-1.1-2.5-2.1-.2-.3-.2-.4 0-.6l.5-.6c.2-.2.2-.4.1-.6l-.8-1.8c-.1-.3-.3-.3-.5-.3h-.8Z" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </a>;
}
