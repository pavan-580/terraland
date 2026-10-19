"use client";

import { useState } from "react";
import {
  X,
  Calendar,
  CheckCircle2,
  MapPin,
  Sunrise,
  Sun,
  Sunset,
  Car,
  ExternalLink,
  MessageSquare
} from "lucide-react";

interface SiteVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export function SiteVisitModal({ isOpen, onClose, property }: SiteVisitModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [proposedTime, setProposedTime] = useState("Morning (10:00 AM - 1:00 PM)");
  const [needPickup, setNeedPickup] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  // Date helpers
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // Find next Saturday
  const saturday = new Date(today);
  const daysUntilSat = (6 - today.getDay() + 7) % 7 || 7;
  saturday.setDate(today.getDate() + daysUntilSat);
  const saturdayStr = saturday.toISOString().slice(0, 10);

  // Find next Sunday
  const sunday = new Date(today);
  const daysUntilSun = (7 - today.getDay()) % 7 || 7;
  sunday.setDate(today.getDate() + daysUntilSun);
  const sundayStr = sunday.toISOString().slice(0, 10);

  const timeSlots = [
    {
      id: "Morning (10:00 AM - 1:00 PM)",
      label: "Morning",
      time: "10 AM - 1 PM",
      icon: Sunrise
    },
    {
      id: "Afternoon (1:00 PM - 4:00 PM)",
      label: "Afternoon",
      time: "1 PM - 4 PM",
      icon: Sun
    },
    {
      id: "Evening (4:00 PM - 6:30 PM)",
      label: "Evening",
      time: "4 PM - 6:30 PM",
      icon: Sunset
    }
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const combinedNotes = [
      notes.trim(),
      needPickup ? "✓ Requested pickup assistance from Miyapur Metro Station" : ""
    ].filter(Boolean).join(" | ");

    try {
      const response = await fetch("/api/site-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          name,
          phone: phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`,
          proposedDate: proposedDate || todayStr,
          proposedTime,
          notes: combinedNotes
        })
      });

      const data = await response.json() as { success?: boolean; error?: string; message?: string };

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to schedule site visit. Please try again.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  // Google Calendar Link generator
  function getGoogleCalendarUrl() {
    const cleanDate = (proposedDate || todayStr).replace(/-/g, "");
    const title = encodeURIComponent(`Plot Inspection: ${property.title} - Terraland`);
    const details = encodeURIComponent(
      `Site visit with Terraland founder for ${property.title} in ${property.locality}, ${property.city}.\nPhone: ${phone}\nTime Slot: ${proposedTime}`
    );
    const location = encodeURIComponent(`${property.locality}, ${property.city}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${cleanDate}T043000Z/${cleanDate}T073000Z&details=${details}&location=${location}`;
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content site-visit-dialog" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {success ? (
          <div className="site-visit-success">
            <CheckCircle2 size={52} className="success-icon" />
            <h3>Site Visit Request Confirmed!</h3>
            <p>
              Thank you, <strong>{name}</strong>! Your in-person inspection appointment for <strong>{property.title}</strong> has been logged.
            </p>

            <div className="visit-summary-box">
              <div><strong>Scheduled Date:</strong> {proposedDate || todayStr}</div>
              <div><strong>Time Slot:</strong> {proposedTime}</div>
              <div><strong>Location:</strong> {property.locality}, {property.city}</div>
              {needPickup && <div><strong>Metro Pickup:</strong> Yes, from Miyapur Metro Station</div>}
            </div>

            <p className="visit-note">
              Our founder will call or WhatsApp you at <strong>{phone}</strong> to confirm the exact landmark and accompany you to the parcel.
            </p>

            <div className="success-action-buttons">
              <a
                href={getGoogleCalendarUrl()}
                target="_blank"
                rel="noreferrer"
                className="button button-outline button-small"
              >
                <Calendar size={14} /> Add to Google Calendar <ExternalLink size={12} />
              </a>

              <a
                href={`https://wa.me/918074399963?text=Hi%20Terraland%2C%20I%20just%20scheduled%20a%20site%20visit%20for%20${encodeURIComponent(property.title)}%20on%20${proposedDate || todayStr}.`}
                target="_blank"
                rel="noreferrer"
                className="button button-dark button-small whatsapp-cta"
              >
                <MessageSquare size={14} /> Instant Founder WhatsApp
              </a>
            </div>

            <button type="button" className="button button-outline modal-done-btn" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="site-visit-form">
            <div className="modal-header">
              <span className="eyebrow">PHYSICAL SITE INSPECTION</span>
              <h3>Schedule an In-Person Site Visit</h3>
              <div className="property-preview-strip">
                <MapPin size={16} />
                <div>
                  <strong>{property.title}</strong>
                  <span className="loc-text">{property.locality}, {property.city} · {property.area} {property.unit}</span>
                </div>
              </div>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="form-grid">
              <label>
                Your Full Name <span className="req">*</span>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Suresh Reddy"
                  minLength={2}
                  maxLength={80}
                />
              </label>

              <label>
                Mobile Number (WhatsApp) <span className="req">*</span>
                <div className="phone-input-wrap" style={{ marginTop: "6px" }}>
                  <span className="phone-input-prefix">+91</span>
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      const clean = (val.startsWith("91") && val.length > 10) ? val.slice(2) : val;
                      setPhone(clean.slice(0, 10));
                    }}
                    placeholder="9876543210"
                  />
                </div>
                <small style={{ color: "var(--muted)", fontSize: "11px", marginTop: "4px", display: "block" }}>
                  Enter your 10-digit mobile number (+91 is added automatically).
                </small>
              </label>
            </div>

            {/* Interactive Quick Date Selection */}
            <div className="interactive-section">
              <div className="section-label-row">
                <span className="field-label">1. Choose Inspection Date <span className="req">*</span></span>
              </div>
              <div className="quick-pill-row">
                <button
                  type="button"
                  className={`date-pill ${proposedDate === todayStr ? "is-selected" : ""}`}
                  onClick={() => setProposedDate(todayStr)}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`date-pill ${proposedDate === tomorrowStr ? "is-selected" : ""}`}
                  onClick={() => setProposedDate(tomorrowStr)}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  className={`date-pill ${proposedDate === saturdayStr ? "is-selected" : ""}`}
                  onClick={() => setProposedDate(saturdayStr)}
                >
                  This Saturday
                </button>
                <button
                  type="button"
                  className={`date-pill ${proposedDate === sundayStr ? "is-selected" : ""}`}
                  onClick={() => setProposedDate(sundayStr)}
                >
                  This Sunday
                </button>
              </div>

              <div className="input-with-icon date-input-wrap">
                <Calendar size={16} />
                <input
                  required
                  type="date"
                  min={todayStr}
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                />
              </div>
            </div>

            {/* Interactive Time Slot Cards */}
            <div className="interactive-section">
              <span className="field-label">2. Preferred Time Slot</span>
              <div className="time-slots-grid">
                {timeSlots.map((slot) => {
                  const Icon = slot.icon;
                  const isSelected = proposedTime === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      className={`time-slot-card ${isSelected ? "is-selected" : ""}`}
                      onClick={() => setProposedTime(slot.id)}
                    >
                      <Icon size={18} className="slot-icon" />
                      <strong className="slot-title">{slot.label}</strong>
                      <span className="slot-desc">{slot.time}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Transport Assistance Chip */}
            <button
              type="button"
              className={`transport-toggle-btn ${needPickup ? "is-active" : ""}`}
              onClick={() => setNeedPickup(!needPickup)}
            >
              <Car size={16} className="transport-icon" />
              <span>
                {needPickup
                  ? "✓ Pickup from Miyapur Metro Station selected"
                  : "Need pickup assistance from Miyapur Metro Station?"}
              </span>
            </button>

            <label>
              Specific Questions or Requirements <small>(optional)</small>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Planning to visit with family; want to verify 30-ft road access and corner markers."
                maxLength={500}
              />
            </label>

            <button type="submit" className="button button-dark full-width-btn interactive-submit-btn" disabled={busy}>
              {busy ? "Securing appointment…" : "Confirm Free Site Visit Appointment"}
            </button>

            <p className="privacy-note">
              100% Free · Zero middle agents · Directly accompanied by the Terraland founder
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
