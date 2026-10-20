"use client";

import { useEffect, useState } from "react";
import { Phone, MessageSquare, Plus, Calendar, Trash2 } from "lucide-react";

interface Lead {
  id: string;
  type: "buyer" | "seller";
  referenceId: string | null;
  name: string;
  phone: string;
  email: string;
  status: string;
  source: string;
  assignedPerson: string;
  lastContactDate: string | null;
  nextFollowUpDate: string | null;
  notes: string;
  statusHistory: string;
  createdAt: string;
}

const leadStatuses = [
  { value: "new", label: "New Lead" },
  { value: "contacted", label: "Initial Contact Made" },
  { value: "requirements_gathered", label: "Requirements Documented" },
  { value: "site_visit_requested", label: "Site Visit Requested" },
  { value: "site_visit_scheduled", label: "Site Visit Scheduled" },
  { value: "site_visit_completed", label: "Site Visit Completed" },
  { value: "negotiation", label: "In Price Negotiation" },
  { value: "closed_won", label: "Transaction Closed (Won)" },
  { value: "closed_lost", label: "Closed / Lost" },
  { value: "on_hold", label: "On Hold / Follow Up Later" },
];

export function AdminLeadsCrm() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingNoteId, setAddingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  // New lead form state
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newType, setNewType] = useState<"buyer" | "seller">("buyer");
  const [newSource, setNewSource] = useState("personal_network");
  const [newNotes, setNewNotes] = useState("");
  const [newFollowUp, setNewFollowUp] = useState("");

  async function loadLeads() {
    try {
      const res = await fetch("/api/admin/leads", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json() as { leads: Lead[] };
        setLeads(data.leads);
      }
    } catch (err) {
      console.error("Failed to load leads:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/leads", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load leads");
        return res.json() as Promise<{ leads: Lead[] }>;
      })
      .then((data) => {
        if (active) {
          setLeads(data.leads);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load leads:", err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function updateLeadStatus(id: string, status: string) {
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status } : l))
        );
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  }

  async function updateFollowUpDate(id: string, nextFollowUpDate: string) {
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, nextFollowUpDate })
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? { ...l, nextFollowUpDate } : l))
        );
      }
    } catch (err) {
      console.error("Follow-up date update error:", err);
    }
  }

  async function handleAddNote(id: string) {
    if (!noteText.trim()) return;
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, appendNote: noteText.trim() })
      });
      if (res.ok) {
        const today = new Date().toISOString().slice(0, 10);
        setLeads((prev) =>
          prev.map((l) =>
            l.id === id
              ? { ...l, notes: `${l.notes}\n[${today}]: ${noteText.trim()}` }
              : l
          )
        );
        setNoteText("");
        setAddingNoteId(null);
      }
    } catch (err) {
      console.error("Add note error:", err);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          phone: newPhone,
          email: newEmail,
          type: newType,
          source: newSource,
          notes: newNotes,
          nextFollowUpDate: newFollowUp || null
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewName("");
        setNewPhone("");
        setNewEmail("");
        setNewNotes("");
        setNewFollowUp("");
        void loadLeads();
      }
    } catch (err) {
      console.error("Create lead error:", err);
    } finally {
      setActionBusy(false);
    }
  }

  async function deleteLead(id: string) {
    if (!window.confirm("Permanently delete this CRM lead?")) return;
    try {
      const res = await fetch(`/api/admin/leads?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== id));
      }
    } catch (err) {
      console.error("Delete lead error:", err);
    }
  }

  const filtered = leads.filter((l) => {
    if (typeFilter !== "all" && l.type !== typeFilter) return false;
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="admin-crm-view">
      <div className="crm-top-bar">
        <div className="crm-filters">
          <div className="filter-group">
            <span className="label">Type:</span>
            <button
              type="button"
              className={typeFilter === "all" ? "active" : ""}
              onClick={() => setTypeFilter("all")}
            >
              All ({leads.length})
            </button>
            <button
              type="button"
              className={typeFilter === "buyer" ? "active" : ""}
              onClick={() => setTypeFilter("buyer")}
            >
              Buyers ({leads.filter((l) => l.type === "buyer").length})
            </button>
            <button
              type="button"
              className={typeFilter === "seller" ? "active" : ""}
              onClick={() => setTypeFilter("seller")}
            >
              Sellers ({leads.filter((l) => l.type === "seller").length})
            </button>
          </div>

          <div className="filter-group">
            <span className="label">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter-select"
            >
              <option value="all">All Statuses</option>
              {leadStatuses.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          className="button button-dark button-small"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={15} /> Add Personal Connection / Lead
        </button>
      </div>

      {loading ? (
        <p className="admin-empty">Loading CRM leads…</p>
      ) : filtered.length === 0 ? (
        <p className="admin-empty">No leads found matching current filter.</p>
      ) : (
        <div className="leads-list">
          {filtered.map((lead) => {
            const cleanPhone = lead.phone.replace(/[^0-9]/g, "");
            const isDueToday = lead.nextFollowUpDate && lead.nextFollowUpDate <= new Date().toISOString().slice(0, 10);

            return (
              <div key={lead.id} id={`admin-lead-${lead.id}`} className={`lead-card ${lead.type === "seller" ? "is-seller" : "is-buyer"} ${isDueToday ? "is-due" : ""}`}>
                <div className="lead-header">
                  <div className="lead-identity">
                    <span className={`lead-pill ${lead.type}`}>{lead.type.toUpperCase()}</span>
                    <strong>{lead.name}</strong>
                    <span className="lead-source">Source: {lead.source}</span>
                  </div>

                  <div className="lead-actions">
                    <a
                      href={`tel:${lead.phone}`}
                      className="contact-icon-btn"
                      title="Direct phone call"
                    >
                      <Phone size={14} /> Call
                    </a>
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="contact-icon-btn whatsapp"
                      title="Open WhatsApp chat"
                    >
                      <MessageSquare size={14} /> WhatsApp
                    </a>
                    <button
                      type="button"
                      className="delete-icon-btn"
                      onClick={() => void deleteLead(lead.id)}
                      title="Delete lead"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="lead-contact-strip">
                  <span>Phone: <strong>{lead.phone}</strong></span>
                  {lead.email && <span>Email: {lead.email}</span>}
                  <span>Added: {lead.createdAt?.slice(0, 10)}</span>
                </div>

                <div className="lead-status-row">
                  <div className="status-select-wrap">
                    <span className="field-label">Pipeline Stage:</span>
                    <select
                      value={lead.status}
                      onChange={(e) => void updateLeadStatus(lead.id, e.target.value)}
                      className="lead-stage-select"
                    >
                      {leadStatuses.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="followup-wrap">
                    <span className="field-label">Next Action / Follow-up:</span>
                    <div className="input-with-icon">
                      <Calendar size={14} />
                      <input
                        type="date"
                        value={lead.nextFollowUpDate || ""}
                        onChange={(e) => void updateFollowUpDate(lead.id, e.target.value)}
                        className={`followup-date-input ${isDueToday ? "due-highlight" : ""}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="lead-notes-box">
                  <div className="notes-header">
                    <span className="field-label">Notes &amp; Activity Log:</span>
                    <button
                      type="button"
                      className="text-link-small"
                      onClick={() => setAddingNoteId(addingNoteId === lead.id ? null : lead.id)}
                    >
                      {addingNoteId === lead.id ? "Cancel" : "+ Add Note"}
                    </button>
                  </div>

                  <pre className="notes-content">{lead.notes || "No notes recorded yet."}</pre>

                  {addingNoteId === lead.id && (
                    <div className="add-note-form">
                      <input
                        type="text"
                        placeholder="Log meeting notes, budget update, or next step…"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleAddNote(lead.id);
                        }}
                      />
                      <button
                        type="button"
                        className="button button-dark button-small"
                        disabled={actionBusy}
                        onClick={() => void handleAddNote(lead.id)}
                      >
                        Save Note
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateLead} className="modal-form">
              <h3>Add Lead to Pipeline</h3>
              <p>Record a personal network connection, referral, or offline lead.</p>

              <label>
                Contact Name <span className="req">*</span>
                <input
                  required
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Anand Varma"
                />
              </label>

              <label>
                Phone Number <span className="req">*</span>
                <input
                  required
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                />
              </label>

              <label>
                Email Address
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. anand@example.com"
                />
              </label>

              <div className="form-row">
                <label>
                  Lead Type
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as "buyer" | "seller")}
                  >
                    <option value="buyer">Buyer (Looking to purchase plot)</option>
                    <option value="seller">Seller (Plot owner in Miyapur)</option>
                  </select>
                </label>

                <label>
                  Source
                  <select value={newSource} onChange={(e) => setNewSource(e.target.value)}>
                    <option value="personal_network">Personal Network / Friend</option>
                    <option value="phone_call">Direct Inbound Call</option>
                    <option value="whatsapp">WhatsApp Message</option>
                    <option value="site_banner">Physical Plot Signage</option>
                    <option value="referral">Referral from client</option>
                  </select>
                </label>
              </div>

              <label>
                Next Follow-Up Date
                <input
                  type="date"
                  value={newFollowUp}
                  onChange={(e) => setNewFollowUp(e.target.value)}
                />
              </label>

              <label>
                Initial Notes &amp; Requirements
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Looking for 200 sq. yd. East-facing plot in Miyapur, budget 65L, ready funds."
                />
              </label>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-dark"
                  disabled={actionBusy}
                >
                  {actionBusy ? "Saving…" : "Add Lead to CRM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

