"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

type LenderInterestRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  amount: number;
  message: string;
  notificationStatus: string;
  notificationError: string | null;
  createdAt: string;
};

export function LenderInterestList({ leads: initialLeads }: { leads: LenderInterestRow[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function deleteLead(id: string) {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "lender-interest", id }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? "The lender registration could not be deleted.");
      setLeads((current) => current.filter((lead) => lead.id !== id));
      setConfirmingId(null);
      setMessage(result.message ?? "Lender registration deleted.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The lender registration could not be deleted.");
    } finally {
      setBusyId(null);
    }
  }

  return <>
    {error && <p className="form-error" role="alert">{error}</p>}
    {message && <p className="admin-success" role="status">{message}</p>}
    <div className="admin-record-top"><strong>LENDER INTERESTS</strong><strong>{leads.length}</strong></div>
    <div className="admin-record-list">{leads.length ? leads.map((lead) => <article className="admin-record" key={lead.id}>
      <div className="admin-record-top"><div><span className="eyebrow">{lead.notificationStatus === "sent" ? "ADMIN EMAIL SENT" : "ADMIN EMAIL PENDING"} · {new Date(lead.createdAt.includes("T") ? lead.createdAt : lead.createdAt.replace(" ", "T") + "Z").toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span><strong>{lead.name}</strong></div><strong>₹{Number(lead.amount).toLocaleString("en-IN")}</strong></div>
      <div className="admin-inquiry-contact"><a href={"mailto:" + lead.email}>{lead.email}</a><a href={"tel:" + lead.phone}>{lead.phone}</a></div>
      {lead.message && <p>{lead.message}</p>}
      {lead.notificationError && <p className="admin-email-error">{lead.notificationError}</p>}
      {confirmingId === lead.id ? <div className="admin-delete-confirm"><span>Delete this lender registration?</span><button type="button" className="admin-delete" disabled={busyId === lead.id} onClick={() => void deleteLead(lead.id)}>{busyId === lead.id ? "Deleting…" : "Confirm delete"}</button><button type="button" className="admin-cancel-delete" disabled={busyId === lead.id} onClick={() => setConfirmingId(null)}>Cancel</button></div> : <button type="button" className="admin-delete lender-delete-button" onClick={() => { setError(""); setMessage(""); setConfirmingId(lead.id); }}><Trash2 size={14} /> Delete lender</button>}
    </article>) : <p className="admin-empty">No lender interest registrations yet.</p>}</div>
  </>;
}
