"use client";

import { useState } from "react";
import { CheckCircle2, ArrowRight, ShieldCheck, MapPin, Compass, ChevronDown } from "lucide-react";

interface BuyerRequirementFormProps {
  source?: string;
  initialLocality?: string;
  onSuccess?: () => void;
  compact?: boolean;
}

export function BuyerRequirementForm({
  source = "buyer_requirement_page",
  initialLocality = "Miyapur, Hyderabad",
  onSuccess,
  compact = false
}: BuyerRequirementFormProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredLocation, setPreferredLocation] = useState(initialLocality);
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [minPlotSize, setMinPlotSize] = useState("");
  const [maxPlotSize, setMaxPlotSize] = useState("");
  const [intendedUse, setIntendedUse] = useState("residential_construction");
  const [timeline, setTimeline] = useState("1-3_months");
  const [fundingReadiness, setFundingReadiness] = useState("ready_cash");
  const [preferredContactMethod, setPreferredContactMethod] = useState("phone");
  const [contactConsent, setContactConsent] = useState(true);
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const response = await fetch("/api/buyer-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`,
          email: email || undefined,
          preferredLocation,
          minBudget: minBudget ? Number(minBudget) * 100000 : 0, // In lakhs to rupees
          maxBudget: maxBudget ? Number(maxBudget) * 100000 : 0,
          minPlotSize: minPlotSize ? Number(minPlotSize) : 0,
          maxPlotSize: maxPlotSize ? Number(maxPlotSize) : 0,
          intendedUse,
          timeline,
          fundingReadiness,
          preferredContactMethod,
          contactConsent,
          source,
          notes
        })
      });

      const data = await response.json() as { error?: string; success?: boolean; message?: string };

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to register requirement. Please check your details.");
        return;
      }

      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="buyer-requirement-success" role="status">
        <CheckCircle2 size={44} className="success-icon" />
        <h3>Requirement Registered Successfully</h3>
        <p>
          Thank you, <strong>{name}</strong>. Because NILAY maintains zero fake listings, our founder personally reviews every verified plot in the Miyapur corridor against your preferences.
        </p>
        <p className="success-subtext">
          We will contact you via <strong>{preferredContactMethod}</strong> ({phone}) with direct, owner-verified plot options and due diligence summaries.
        </p>
        <button
          type="button"
          className="button button-outline"
          onClick={() => {
            setSubmitted(false);
            setNotes("");
          }}
        >
          Submit another requirement
        </button>
      </div>
    );
  }

  return (
    <form className={`buyer-requirement-form ${compact ? "is-compact" : ""}`} onSubmit={handleSubmit}>
      {!compact && (
        <div className="requirement-form-header">
          <div className="badge-pill">
            <Compass size={14} /> Direct Plot Matchmaking
          </div>
          <h2>Can&apos;t find the right plot? Let us find it for you.</h2>
          <p>
            Tell us your preferred locality, plot dimensions, and budget in the Miyapur-West corridor. The founder will match you directly with genuine sellers and verified titles.
          </p>
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      <div className="form-grid">
        <label>
          Full Name <span className="req">*</span>
          <input
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ramesh Kumar"
            minLength={2}
            maxLength={80}
          />
        </label>

        <label>
          Mobile Number (WhatsApp preferred) <span className="req">*</span>
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
              placeholder="Enter 10-digit mobile number"
            />
          </div>
          <small style={{ color: "var(--muted)", fontSize: "11px", marginTop: "4px", display: "block" }}>
            Enter your 10-digit mobile number (+91 is added automatically).
          </small>
        </label>
      </div>

      <div className="form-grid">
        <label>
          Email Address <small>(optional)</small>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. ramesh@example.com"
          />
        </label>

        <label>
          Preferred Locality / Corridor <span className="req">*</span>
          <div className="input-with-icon">
            <MapPin size={16} />
            <input
              required
              type="text"
              value={preferredLocation}
              onChange={(e) => setPreferredLocation(e.target.value)}
              placeholder="e.g. Miyapur, Bachupally, Ameenpur, Nizampet, Chandanagar"
            />
          </div>
        </label>
      </div>

      <div className="form-grid">
        <div className="budget-group">
          <span className="group-label">Budget Range (in Lakhs ₹)</span>
          <div className="range-inputs">
            <input
              type="number"
              min="0"
              step="1"
              value={minBudget}
              onChange={(e) => setMinBudget(e.target.value)}
              placeholder="Min (e.g. 40)"
            />
            <span className="to-divider">to</span>
            <input
              type="number"
              min="0"
              step="1"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              placeholder="Max (e.g. 80)"
            />
          </div>
        </div>

        <div className="budget-group">
          <span className="group-label">Plot Size Range (Square Yards)</span>
          <div className="range-inputs">
            <input
              type="number"
              min="0"
              step="10"
              value={minPlotSize}
              onChange={(e) => setMinPlotSize(e.target.value)}
              placeholder="Min (e.g. 150)"
            />
            <span className="to-divider">to</span>
            <input
              type="number"
              min="0"
              step="10"
              value={maxPlotSize}
              onChange={(e) => setMaxPlotSize(e.target.value)}
              placeholder="Max (e.g. 300)"
            />
          </div>
        </div>
      </div>

      <div className="form-grid">
        <label>
          Intended Purpose
          <div className="custom-select-wrap">
            <select value={intendedUse} onChange={(e) => setIntendedUse(e.target.value)}>
              <option value="residential_construction">Immediate Residential Home Construction</option>
              <option value="land_investment">Medium to Long Term Plot Investment</option>
              <option value="commercial_plot">Commercial / Mixed-use Development</option>
              <option value="farm_land">Farm / Weekend Retreat Plot</option>
            </select>
            <ChevronDown size={14} className="select-chevron" />
          </div>
        </label>

        <label>
          Expected Purchase Timeline
          <div className="custom-select-wrap">
            <select value={timeline} onChange={(e) => setTimeline(e.target.value)}>
              <option value="immediate">Immediate (Ready to register within 30 days)</option>
              <option value="1-3_months">1 to 3 Months</option>
              <option value="3-6_months">3 to 6 Months</option>
              <option value="exploring">Currently Researching &amp; Comparing</option>
            </select>
            <ChevronDown size={14} className="select-chevron" />
          </div>
        </label>
      </div>

      <div className="form-grid">
        <label>
          Payment / Funding Readiness
          <div className="custom-select-wrap">
            <select value={fundingReadiness} onChange={(e) => setFundingReadiness(e.target.value)}>
              <option value="ready_cash">Self-Funded / Funds Ready</option>
              <option value="bank_loan_preapproved">Bank Housing/Plot Loan Pre-Approved</option>
              <option value="loan_needed">Will apply for Bank Loan upon title check</option>
              <option value="selling_property">Dependent on selling another asset</option>
            </select>
            <ChevronDown size={14} className="select-chevron" />
          </div>
        </label>

        <label>
          Preferred Contact Method
          <div className="custom-select-wrap">
            <select value={preferredContactMethod} onChange={(e) => setPreferredContactMethod(e.target.value)}>
              <option value="phone">Direct Phone Call</option>
              <option value="whatsapp">WhatsApp Message</option>
              <option value="email">Email</option>
            </select>
            <ChevronDown size={14} className="select-chevron" />
          </div>
        </label>
      </div>

      <label>
        Specific Preferences or Questions <small>(optional)</small>
        <textarea
          rows={compact ? 2 : 3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. East or North facing preferred; 30+ ft road width; proximity to Miyapur Metro or schools; HMDA approved layout preferred."
        />
      </label>

      <label className="checkbox-consent">
        <input
          required
          type="checkbox"
          checked={contactConsent}
          onChange={(e) => setContactConsent(e.target.checked)}
        />
        <span>
          I agree to be contacted by NILAY regarding matching residential plots in the Miyapur corridor. No spam; verified properties only.
        </span>
      </label>

      <button type="submit" className="button button-dark full-width-btn" disabled={busy}>
        {busy ? "Registering requirement…" : "Register My Plot Requirement"} <ArrowRight size={16} />
      </button>

      <div className="trust-footnote">
        <ShieldCheck size={14} />
        <span>Strict privacy. Direct founder coordination. Zero automated spam calls.</span>
      </div>
    </form>
  );
}

