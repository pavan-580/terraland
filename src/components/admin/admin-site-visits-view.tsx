"use client";

import { useEffect, useState } from "react";
import { Calendar, MapPin, Phone, MessageSquare } from "lucide-react";

interface SiteVisit {
  id: string;
  leadId: string | null;
  propertyId: string;
  buyerName: string;
  buyerPhone: string;
  sellerName: string;
  sellerPhone: string;
  proposedDate: string;
  proposedTime: string;
  confirmationStatus: "proposed" | "confirmed" | "completed" | "cancelled";
  buyerFeedback: string;
  propertyTitle: string;
  locality: string;
  city: string;
  price: number;
  area: number;
  unit: string;
  createdAt: string;
}

export function AdminSiteVisitsView() {
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadVisits() {
    try {
      const res = await fetch("/api/site-visits", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json() as { visits: SiteVisit[] };
        setVisits(data.visits);
      }
    } catch (err) {
      console.error("Failed to load site visits:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/site-visits", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load site visits");
        return res.json() as Promise<{ visits: SiteVisit[] }>;
      })
      .then((data) => {
        if (active) {
          setVisits(data.visits);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load site visits:", err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="admin-visits-view">
      <div className="view-header">
        <div>
          <span className="eyebrow">PHYSICAL SITE INSPECTIONS</span>
          <h3>Scheduled Site Visits ({visits.length})</h3>
        </div>
        <button
          type="button"
          className="button button-outline button-small"
          onClick={() => void loadVisits()}
        >
          Refresh Visits
        </button>
      </div>

      {loading ? (
        <p className="admin-empty">Loading scheduled visits…</p>
      ) : visits.length === 0 ? (
        <p className="admin-empty">No site visits requested yet.</p>
      ) : (
        <div className="visits-cards-grid">
          {visits.map((visit) => {
            const cleanBuyerPhone = visit.buyerPhone.replace(/[^0-9]/g, "");
            const cleanSellerPhone = visit.sellerPhone.replace(/[^0-9]/g, "");
            const isUpcoming = visit.proposedDate >= new Date().toISOString().slice(0, 10);

            return (
              <div key={visit.id} className={`visit-card ${isUpcoming ? "is-upcoming" : "is-past"}`}>
                <div className="visit-card-header">
                  <div>
                    <span className={`visit-status-tag ${visit.confirmationStatus}`}>
                      {visit.confirmationStatus.toUpperCase()}
                    </span>
                    <h4>{visit.propertyTitle}</h4>
                    <div className="visit-loc">
                      <MapPin size={13} /> {visit.locality}, {visit.city} · {visit.area} {visit.unit}
                    </div>
                  </div>

                  <div className="visit-datetime-badge">
                    <Calendar size={14} />
                    <strong>{visit.proposedDate}</strong>
                    <small>{visit.proposedTime}</small>
                  </div>
                </div>

                <div className="stakeholder-box">
                  <div className="party-col">
                    <span className="party-label">BUYER (VISITING):</span>
                    <strong>{visit.buyerName}</strong>
                    <span>{visit.buyerPhone}</span>
                    <div className="party-actions">
                      <a href={`tel:${visit.buyerPhone}`} className="contact-icon-btn">
                        <Phone size={13} /> Call
                      </a>
                      <a
                        href={`https://wa.me/${cleanBuyerPhone}?text=Hello%20${encodeURIComponent(visit.buyerName)}%2C%20this%20is%20Terraland%20regarding%20your%20site%20visit%20for%20${encodeURIComponent(visit.propertyTitle)}%20on%20${visit.proposedDate}.`}
                        target="_blank"
                        rel="noreferrer"
                        className="contact-icon-btn whatsapp"
                      >
                        <MessageSquare size={13} /> WhatsApp
                      </a>
                    </div>
                  </div>

                  <div className="party-divider" />

                  <div className="party-col">
                    <span className="party-label">LANDOWNER / SELLER:</span>
                    <strong>{visit.sellerName || "Direct Owner"}</strong>
                    <span>{visit.sellerPhone || "Contact in listing"}</span>
                    {visit.sellerPhone && (
                      <div className="party-actions">
                        <a href={`tel:${visit.sellerPhone}`} className="contact-icon-btn">
                          <Phone size={13} /> Call
                        </a>
                        <a
                          href={`https://wa.me/${cleanSellerPhone}?text=Hello%20${encodeURIComponent(visit.sellerName)}%2C%20this%20is%20Terraland.%20A%20verified%20buyer%20wishes%20to%20visit%20your%20plot%20on%20${visit.proposedDate}.`}
                          target="_blank"
                          rel="noreferrer"
                          className="contact-icon-btn whatsapp"
                        >
                          <MessageSquare size={13} /> WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {visit.buyerFeedback && (
                  <div className="visit-notes">
                    <strong>Buyer Notes:</strong>
                    <p>{visit.buyerFeedback}</p>
                  </div>
                )}

                <div className="visit-footer">
                  <span>Requested: {visit.createdAt?.slice(0, 10)}</span>
                  <span className="founder-assist-pill">Founder Accompanied</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

