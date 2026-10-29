"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Calendar, Download, Eye, Sparkles, Users } from "lucide-react";

interface DailySummaryData {
  pendingPropertiesCount: number;
  recentInquiriesCount: number;
  activeLeadsCount: number;
  pendingMatchesCount: number;
  publishedListingsCount: number;
  followUpsDueCount: number;
  upcomingVisitsCount: number;
  followUpsDue: { id: string; name: string; phone: string; type: string; nextFollowUpDate: string; notes: string; status: string }[];
  upcomingVisits: { id: string; buyerName: string; buyerPhone: string; proposedDate: string; proposedTime: string; confirmationStatus: string; propertyTitle: string; locality: string }[];
}

interface AdminDailySummaryProps {
  onSelectSection: (
    section: "leads" | "properties" | "visits" | "matches" | "requirements",
    options?: { listingTab?: "sale" | "rent" | "hidden" | "pending"; leadId?: string }
  ) => void;
}

export function AdminDailySummary({ onSelectSection }: AdminDailySummaryProps) {
  const [summary, setSummary] = useState<DailySummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/summary", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch summary");
        return res.json() as Promise<{ summary: DailySummaryData }>;
      })
      .then((data) => {
        if (active) {
          setSummary(data.summary);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch daily summary:", err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading || !summary) {
    return <div className="admin-summary-strip loading">Refreshing founder daily summary…</div>;
  }

  return (
    <section className="admin-summary-card">
      <div className="admin-summary-header">
        <div>
          <span className="eyebrow">SOLO OPERATOR PIPELINE</span>
          <h2>Founder Daily Summary</h2>
        </div>
        <div className="admin-export-group">
          <a
            href="/api/admin/export?type=leads"
            download="nilay-leads.csv"
            className="admin-export-btn"
            title="Download full CSV of all buyer and seller leads"
          >
            <Download size={14} /> Leads (CSV)
          </a>
          <a
            href="/api/admin/export?type=inquiries"
            download="nilay-inquiries.csv"
            className="admin-export-btn"
            title="Download full CSV of property enquiries"
          >
            <Download size={14} /> Inquiries (CSV)
          </a>
          <a
            href="/api/admin/export?type=buyer_requirements"
            download="nilay-buyer-requirements.csv"
            className="admin-export-btn"
            title="Download full CSV of buyer requirements"
          >
            <Download size={14} /> Requirements (CSV)
          </a>
        </div>
      </div>

      <div className="summary-metrics-grid">
        <button
          type="button"
          className="metric-tile"
          onClick={() => onSelectSection("leads")}
        >
          <div className="metric-icon-wrap"><Users size={16} /></div>
          <span className="metric-label">Active Leads</span>
          <strong className="metric-val">{summary.activeLeadsCount}</strong>
          <small className="metric-sub">{summary.recentInquiriesCount} new in 48h</small>
        </button>

        <button
          type="button"
          className={`metric-tile ${summary.followUpsDueCount > 0 ? "has-alert" : ""}`}
          onClick={() => onSelectSection("leads", { leadId: summary.followUpsDue[0]?.id })}
        >
          <div className="metric-icon-wrap"><AlertCircle size={16} /></div>
          <span className="metric-label">Follow-ups Due</span>
          <strong className="metric-val">{summary.followUpsDueCount}</strong>
          <small className="metric-sub">{summary.followUpsDueCount > 0 ? "Action required today" : "Up to date"}</small>
        </button>

        <button
          type="button"
          className="metric-tile"
          onClick={() => onSelectSection("visits")}
        >
          <div className="metric-icon-wrap"><Calendar size={16} /></div>
          <span className="metric-label">Upcoming Visits</span>
          <strong className="metric-val">{summary.upcomingVisitsCount}</strong>
          <small className="metric-sub">Scheduled site visits</small>
        </button>

        <button
          type="button"
          className={`metric-tile ${summary.pendingPropertiesCount > 0 ? "has-alert" : ""}`}
          onClick={() => onSelectSection("properties", { listingTab: "pending" })}
        >
          <div className="metric-icon-wrap"><Eye size={16} /></div>
          <span className="metric-label">Plots Awaiting Review</span>
          <strong className="metric-val">{summary.pendingPropertiesCount}</strong>
          <small className="metric-sub">Unverified seller submissions</small>
        </button>

        <button
          type="button"
          className="metric-tile"
          onClick={() => onSelectSection("matches")}
        >
          <div className="metric-icon-wrap"><Sparkles size={16} /></div>
          <span className="metric-label">Matches to Review</span>
          <strong className="metric-val">{summary.pendingMatchesCount}</strong>
          <small className="metric-sub">Rule-based buyer matches</small>
        </button>
      </div>

      {summary.followUpsDue.length > 0 && (
        <div className="founder-urgent-row">
          <div className="urgent-title">
            <AlertCircle size={15} />
            <strong>Follow-ups due today:</strong>
          </div>
          <div className="urgent-list">
            {summary.followUpsDue.map((item) => (
              <div key={item.id} className="urgent-item">
                <span>{item.name} ({item.phone}) · {item.type}</span>
                <button
                  type="button"
                  className="quick-action-link"
                  onClick={() => onSelectSection("leads", { leadId: item.id })}
                >
                  View Lead →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
