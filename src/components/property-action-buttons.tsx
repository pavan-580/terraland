"use client";

import { useState } from "react";
import { Calendar, Phone, MessageSquare, UserRound } from "lucide-react";
import Link from "next/link";
import { SiteVisitModal } from "@/components/site-visit-modal";
import { SellerPhoneLink } from "@/components/seller-phone-link";

interface PropertyActionButtonsProps {
  property: {
    id: string;
    title: string;
    locality: string;
    city: string;
    price: number;
    area: number;
    unit: string;
    phone?: string;
    owner: string;
    sellerContactsVisible: boolean;
    type?: string;
    listingCategory?: string;
    facing?: string;
    roadWidth?: string;
    description?: string;
    approvals?: string;
  };
  adminPhone?: string;
  showSellerPhones?: boolean;
  user?: { name: string; phone?: string; email?: string } | null;
}

function formatPrice(val: number) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(val % 10000000 ? 2 : 0)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(val % 100000 ? 1 : 0)} Lakhs`;
  return `₹${new Intl.NumberFormat("en-IN").format(val)}`;
}

export function PropertyActionButtons({
  property,
  adminPhone = "8074399963",
  showSellerPhones = true,
  user = null,
}: PropertyActionButtonsProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const targetAdminPhone = (adminPhone || "8074399963").replace(/\D/g, "");
  const cleanPhone = targetAdminPhone.length === 10 ? `91${targetAdminPhone}` : targetAdminPhone;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://terraland.onrender.com").replace(/\/+$/, "");
  const listingUrl = `${siteUrl}/properties/${encodeURIComponent(property.id)}`;
  const category = property.listingCategory === "rent" ? "For rent" : "For sale";

  const details = [
    `Hello NILAY Team, I want to connect regarding this plot:`,
    `📍 Title: ${property.title}`,
    `🆔 ID: ${property.id}`,
    `🏷️ Category: ${property.type || "Plot"} (${category})`,
    `📌 Location: ${[property.locality, property.city].filter(Boolean).join(", ")}`,
    `💰 Price: ${formatPrice(property.price)}`,
    `📐 Plot Size: ${property.area} ${property.unit}`,
    property.facing ? `🧭 Facing: ${property.facing}` : "",
    property.roadWidth ? `🛣️ Road Width: ${property.roadWidth}` : "",
    property.approvals ? `📜 Approvals: ${property.approvals}` : "",
    user?.name ? `👤 Inquirer Name: ${user.name}` : "",
    user?.phone ? `📞 Inquirer Phone: ${user.phone}` : "",
    user?.email ? `✉️ Inquirer Email: ${user.email}` : "",
    `🔗 Listing: ${listingUrl}`,
  ].filter(Boolean).join("\n");

  const connectWhatsAppUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(details)}`;

  function handleConnectClick() {
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

  // Seller phone is visible ONLY if direct seller phones are allowed AND this property has a phone
  const hasDirectPhone = Boolean(property.phone && showSellerPhones);
  // Show "Connect with us" if seller phones are hidden, or if user is signed in without a direct phone, or if phone is hidden
  const showConnectWithUs = !showSellerPhones || Boolean(user) || !property.sellerContactsVisible;

  return (
    <>
      <div className={`property-action-buttons${modalOpen ? " is-modal-open" : ""}`}>
        <button
          type="button"
          className="button button-dark full-width-btn"
          onClick={() => setModalOpen(true)}
        >
          <Calendar size={16} /> <span>Schedule a plot visit</span>
        </button>

        {hasDirectPhone ? (
          <SellerPhoneLink propertyId={property.id} phone={property.phone!} owner={property.owner} className="button button-outline full-width-btn sticky-seller-phone">
            <Phone size={16} /> <span>{property.phone}</span>
          </SellerPhoneLink>
        ) : showConnectWithUs ? (
          <a
            href={connectWhatsAppUrl}
            target="_blank"
            rel="noreferrer"
            onClick={handleConnectClick}
            className="button button-outline full-width-btn sticky-seller-phone connect-with-us-btn"
            title="Send complete listing details to NILAY on WhatsApp"
          >
            <MessageSquare size={16} /> <span>Connect with us</span>
          </a>
        ) : (
          <Link href={`/sign-in?next=${encodeURIComponent(`/properties/${property.id}`)}`} className="button button-outline full-width-btn sticky-seller-phone">
            <UserRound size={16} /> <span>Sign in for seller number</span>
          </Link>
        )}
      </div>

      <SiteVisitModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        property={property}
      />
    </>
  );
}
