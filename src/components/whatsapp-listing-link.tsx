"use client";

import type { MouseEvent } from "react";
import { MessageCircle } from "lucide-react";
import { formatListingPrice, type Property } from "@/lib/market";

const customerCareNumber = "918074399963";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://terraland.in").replace(/\/+$/, "");

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
    <MessageCircle size={17} aria-hidden="true" />
  </a>;
}
