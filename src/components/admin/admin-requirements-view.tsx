"use client";

import { useEffect, useState } from "react";
import { Phone, MessageSquare, MapPin, Compass, IndianRupee, Layers } from "lucide-react";

interface BuyerRequirement {
  id: string;
  name: string;
  phone: string;
  email: string;
  preferredLocation: string;
  minBudget: number;
  maxBudget: number;
  minPlotSize: number;
  maxPlotSize: number;
  intendedUse: string;
  timeline: string;
  fundingReadiness: string;
  preferredContactMethod: string;
  source: string;
  status: string;
  assignedTo: string;
  notes: string;
  createdAt: string;
}

export function AdminRequirementsView() {
  const [requirements, setRequirements] = useState<BuyerRequirement[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRequirements() {
    try {
      const res = await fetch("/api/buyer-requirements", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json() as { requirements: BuyerRequirement[] };
        setRequirements(data.requirements);
      }
    } catch (err) {
      console.error("Failed to load buyer requirements:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/buyer-requirements", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load buyer requirements");
        return res.json() as Promise<{ requirements: BuyerRequirement[] }>;
      })
      .then((data) => {
        if (active) {
          setRequirements(data.requirements);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load buyer requirements:", err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="admin-requirements-view">
      <div className="view-header">
        <div>
          <span className="eyebrow">BUYER ACQUISITION INTAKE</span>
          <h3>Registered Buyer Plot Requirements ({requirements.length})</h3>
        </div>
        <button
          type="button"
          className="button button-outline button-small"
          onClick={() => void loadRequirements()}
        >
          Refresh Requirements
        </button>
      </div>

      {loading ? (
        <p className="admin-empty">Loading buyer requirements…</p>
      ) : requirements.length === 0 ? (
        <p className="admin-empty">No buyer requirements registered yet.</p>
      ) : (
        <div className="requirements-cards-grid">
          {requirements.map((req) => {
            const cleanPhone = req.phone.replace(/[^0-9]/g, "");
            const budgetStr = req.minBudget || req.maxBudget
              ? `₹${(req.minBudget / 100000).toFixed(0)}L - ₹${(req.maxBudget / 100000).toFixed(0)}L`
              : "Flexible";
            const sizeStr = req.minPlotSize || req.maxPlotSize
              ? `${req.minPlotSize} - ${req.maxPlotSize} sq. yds`
              : "Flexible";

            return (
              <div key={req.id} className="requirement-admin-card">
                <div className="card-top">
                  <div>
                    <strong>{req.name}</strong>
                    <div className="contact-line">
                      <span>{req.phone}</span>
                      {req.email && <span> · {req.email}</span>}
                    </div>
                  </div>

                  <div className="quick-actions">
                    <a href={`tel:${req.phone}`} className="contact-icon-btn" title="Call buyer">
                      <Phone size={14} /> Call
                    </a>
                    <a
                      href={`https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(req.name)}%2C%20this%20is%20the%20founder%20at%20NILAY.%20I%20am%20reviewing%20your%20plot%20requirement%20for%20${encodeURIComponent(req.preferredLocation)}.`}
                      target="_blank"
                      rel="noreferrer"
                      className="contact-icon-btn whatsapp"
                      title="WhatsApp buyer"
                    >
                      <MessageSquare size={14} /> WhatsApp
                    </a>
                  </div>
                </div>

                <div className="req-specs-grid">
                  <div className="spec-item">
                    <MapPin size={14} />
                    <span>Location: <strong>{req.preferredLocation}</strong></span>
                  </div>
                  <div className="spec-item">
                    <IndianRupee size={14} />
                    <span>Budget: <strong>{budgetStr}</strong></span>
                  </div>
                  <div className="spec-item">
                    <Layers size={14} />
                    <span>Plot Size: <strong>{sizeStr}</strong></span>
                  </div>
                  <div className="spec-item">
                    <Compass size={14} />
                    <span>Timeline: <strong>{req.timeline}</strong></span>
                  </div>
                </div>

                <div className="req-details-strip">
                  <span>Intended Use: <strong>{req.intendedUse}</strong></span>
                  <span>Funding: <strong>{req.fundingReadiness}</strong></span>
                  <span>Contact via: <strong>{req.preferredContactMethod}</strong></span>
                  <span>Source: <strong>{req.source}</strong></span>
                </div>

                {req.notes && (
                  <div className="req-notes">
                    <strong>Buyer Preferences:</strong>
                    <p>{req.notes}</p>
                  </div>
                )}

                <div className="card-footer">
                  <span className="date-tag">Registered: {req.createdAt?.slice(0, 10)}</span>
                  <span className={`status-pill ${req.status}`}>{req.status.toUpperCase()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

