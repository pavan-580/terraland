"use client";

import { useEffect, useState } from "react";
import { Sparkles, RefreshCw, CheckCircle, MessageSquare, ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface PropertyMatch {
  id: string;
  score: number;
  explanation: string;
  status: "pending_review" | "approved" | "presented_to_buyer" | "site_visit_arranged" | "rejected";
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  requirementId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  preferredLocation: string;
  minBudget: number;
  maxBudget: number;
  minPlotSize: number;
  maxPlotSize: number;
  timeline: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocality: string;
  propertyCity: string;
  propertyPrice: number;
  propertyArea: number;
  propertyUnit: string;
  sellerName: string;
  sellerPhone: string;
  isNegotiable: string;
}

export function AdminMatchesView() {
  const [matches, setMatches] = useState<PropertyMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  async function loadMatches(recalculate = false) {
    if (recalculate) setScanning(true);
    else setLoading(true);

    try {
      const url = recalculate ? "/api/admin/matches?recalculate=true" : "/api/admin/matches";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json() as { matches: PropertyMatch[] };
        setMatches(data.matches);
      }
    } catch (err) {
      console.error("Failed to load matches:", err);
    } finally {
      setLoading(false);
      setScanning(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/matches", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load matches");
        return res.json() as Promise<{ matches: PropertyMatch[] }>;
      })
      .then((data) => {
        if (active) {
          setMatches(data.matches);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load matches:", err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function updateMatchStatus(id: string, status: string) {
    try {
      const res = await fetch("/api/admin/matches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        setMatches((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status: status as PropertyMatch["status"] } : m))
        );
      }
    } catch (err) {
      console.error("Match status update error:", err);
    }
  }

  const filtered = matches.filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="admin-matches-view">
      <div className="view-header">
        <div>
          <span className="eyebrow">DETERMINISTIC RULE-BASED MATCHING</span>
          <h3>Buyer-to-Plot Matches ({matches.length})</h3>
        </div>
        <div className="view-actions">
          <button
            type="button"
            className="button button-dark button-small"
            disabled={scanning}
            onClick={() => void loadMatches(true)}
          >
            <RefreshCw size={14} className={scanning ? "spin-icon" : ""} />
            {scanning ? "Scanning portfolio…" : "Run Matchmaker Scan"}
          </button>
        </div>
      </div>

      <div className="matches-filter-row">
        <span>Filter:</span>
        <button
          type="button"
          className={statusFilter === "all" ? "active" : ""}
          onClick={() => setStatusFilter("all")}
        >
          All ({matches.length})
        </button>
        <button
          type="button"
          className={statusFilter === "pending_review" ? "active" : ""}
          onClick={() => setStatusFilter("pending_review")}
        >
          Pending Review ({matches.filter((m) => m.status === "pending_review").length})
        </button>
        <button
          type="button"
          className={statusFilter === "approved" ? "active" : ""}
          onClick={() => setStatusFilter("approved")}
        >
          Approved ({matches.filter((m) => m.status === "approved").length})
        </button>
        <button
          type="button"
          className={statusFilter === "presented_to_buyer" ? "active" : ""}
          onClick={() => setStatusFilter("presented_to_buyer")}
        >
          Presented to Buyer ({matches.filter((m) => m.status === "presented_to_buyer").length})
        </button>
      </div>

      {loading ? (
        <p className="admin-empty">Loading transparent matches…</p>
      ) : filtered.length === 0 ? (
        <div className="empty-box">
          <p className="admin-empty">No matches found in this status.</p>
          <button
            type="button"
            className="button button-outline button-small"
            onClick={() => void loadMatches(true)}
          >
            Run Matchmaker Scan
          </button>
        </div>
      ) : (
        <div className="matches-grid">
          {filtered.map((match) => {
            let explanations: string[] = [];
            try {
              explanations = JSON.parse(match.explanation || "[]");
            } catch {
              explanations = [match.explanation];
            }

            const cleanBuyerPhone = match.buyerPhone.replace(/[^0-9]/g, "");
            const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://terraland.onrender.com";
            const propUrl = `${siteUrl}/properties/${encodeURIComponent(match.propertyId)}`;
            const whatsappText = `Hello ${match.buyerName}, based on your plot requirement in ${match.preferredLocation}, I found a matching verified plot on Terraland: ${match.propertyTitle} in ${match.propertyLocality}. Price: ₹${match.propertyPrice.toLocaleString("en-IN")}, Area: ${match.propertyArea} ${match.propertyUnit}. View details: ${propUrl}`;

            return (
              <div key={match.id} className={`match-card status-${match.status}`}>
                <div className="match-card-top">
                  <div className="match-score-badge">
                    <Sparkles size={14} />
                    <strong>{match.score} pts</strong>
                    <span>Transparent Fit</span>
                  </div>

                  <div className="match-status-selector">
                    <label>Stage:</label>
                    <select
                      value={match.status}
                      onChange={(e) => void updateMatchStatus(match.id, e.target.value)}
                    >
                      <option value="pending_review">Pending Review</option>
                      <option value="approved">Approved by Founder</option>
                      <option value="presented_to_buyer">Presented to Buyer</option>
                      <option value="site_visit_arranged">Site Visit Arranged</option>
                      <option value="rejected">Rejected / Not a fit</option>
                    </select>
                  </div>
                </div>

                <div className="match-comparison-grid">
                  <div className="match-col buyer-col">
                    <span className="col-label">BUYER REQUIREMENT</span>
                    <strong>{match.buyerName}</strong>
                    <div className="meta-line">Locality: {match.preferredLocation}</div>
                    <div className="meta-line">
                      Budget: ₹{(match.minBudget / 100000).toFixed(0)}L - ₹{(match.maxBudget / 100000).toFixed(0)}L
                    </div>
                    <div className="meta-line">
                      Size: {match.minPlotSize || 0} - {match.maxPlotSize || "Any"} sq. yd.
                    </div>
                  </div>

                  <div className="match-arrow-center">
                    <ArrowRight size={20} />
                  </div>

                  <div className="match-col property-col">
                    <span className="col-label">PUBLISHED PLOT</span>
                    <Link href={`/properties/${match.propertyId}`} target="_blank" className="prop-title-link">
                      {match.propertyTitle} <ArrowUpRight size={13} />
                    </Link>
                    <div className="meta-line">Locality: {match.propertyLocality}, {match.propertyCity}</div>
                    <div className="meta-line">
                      Price: ₹{match.propertyPrice.toLocaleString("en-IN")} ({match.isNegotiable || "Negotiable"})
                    </div>
                    <div className="meta-line">
                      Size: {match.propertyArea} {match.propertyUnit}
                    </div>
                  </div>
                </div>

                <div className="transparent-criteria-box">
                  <span className="criteria-label">Deterministic Matching Rules Triggered:</span>
                  <ul className="criteria-list">
                    {explanations.map((exp, idx) => (
                      <li key={idx}>
                        <CheckCircle size={13} className="check-icon" /> {exp}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="match-footer-actions">
                  <a
                    href={`https://wa.me/${cleanBuyerPhone}?text=${encodeURIComponent(whatsappText)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="button button-dark button-small"
                    onClick={() => void updateMatchStatus(match.id, "presented_to_buyer")}
                  >
                    <MessageSquare size={14} /> Send WhatsApp Match to Buyer
                  </a>

                  <Link
                    href={`/properties/${match.propertyId}`}
                    target="_blank"
                    className="button button-outline button-small"
                  >
                    Inspect Plot Listing
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

