"use client";

import { useState } from "react";
import { Calendar, MessageSquare } from "lucide-react";
import { SiteVisitModal } from "@/components/site-visit-modal";

interface PropertyActionButtonsProps {
  property: {
    id: string;
    title: string;
    locality: string;
    city: string;
    price: number;
    area: number;
    unit: string;
  };
}

export function PropertyActionButtons({ property }: PropertyActionButtonsProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="property-action-buttons">
        <button
          type="button"
          className="button button-dark full-width-btn"
          onClick={() => setModalOpen(true)}
        >
          <Calendar size={16} /> Schedule a Physical Site Visit
        </button>

        <a
          href="#enquiry-section"
          className="button button-outline full-width-btn"
        >
          <MessageSquare size={16} /> Send Direct Plot Enquiry
        </a>
      </div>

      <SiteVisitModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        property={property}
      />
    </>
  );
}

