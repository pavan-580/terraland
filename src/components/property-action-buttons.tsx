"use client";

import { useState } from "react";
import { Calendar, Phone, UserRound } from "lucide-react";
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
  };
}

export function PropertyActionButtons({ property }: PropertyActionButtonsProps) {
  const [modalOpen, setModalOpen] = useState(false);

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

        {property.phone ? (
          <SellerPhoneLink propertyId={property.id} phone={property.phone} owner={property.owner} className="button button-outline full-width-btn sticky-seller-phone">
            <Phone size={16} /> <span>{property.phone}</span>
          </SellerPhoneLink>
        ) : property.sellerContactsVisible ? (
          <a href="#enquiry-section" className="button button-outline full-width-btn sticky-seller-phone">
            <Phone size={16} /> <span>Request seller number</span>
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

