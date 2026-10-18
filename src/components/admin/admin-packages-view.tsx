"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ShieldCheck, FileCheck } from "lucide-react";

interface ServicePackage {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientRole: "seller" | "buyer";
  propertyId: string | null;
  packageType: string;
  agreedPrice: number;
  durationDays: number;
  invoiceStatus: "draft" | "sent" | "paid";
  paymentStatus: "unpaid" | "paid" | "waived";
  paymentConfirmedAt: string | null;
  deliverables: string;
  notes: string;
  propertyTitle: string | null;
  locality: string | null;
  createdAt: string;
}

const packageTypes = [
  { value: "free_listing", label: "Free Verified Listing (₹0 launch tier)" },
  { value: "featured_plot", label: "Featured Miyapur Corridor Listing" },
  { value: "assisted_site_visits", label: "Assisted Site Visits & Negotiation" },
  { value: "title_due_diligence_liaison", label: "Document Collection & Legal Liaison" },
  { value: "end_to_end_transaction", label: "End-to-End Transaction Management" },
];

export function AdminPackagesView() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [busy, setBusy] = useState(false);

  // Form states
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientRole, setClientRole] = useState<"seller" | "buyer">("seller");
  const [packageType, setPackageType] = useState("free_listing");
  const [agreedPrice, setAgreedPrice] = useState("0");
  const [durationDays, setDurationDays] = useState("30");
  const [deliverables, setDeliverables] = useState("");
  const [notes, setNotes] = useState("");

  async function loadPackages() {
    try {
      const res = await fetch("/api/admin/packages", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json() as { packages: ServicePackage[] };
        setPackages(data.packages);
      }
    } catch (err) {
      console.error("Failed to load packages:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/packages", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load packages");
        return res.json() as Promise<{ packages: ServicePackage[] }>;
      })
      .then((data) => {
        if (active) {
          setPackages(data.packages);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load packages:", err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function updatePaymentStatus(id: string, paymentStatus: "unpaid" | "paid" | "waived") {
    try {
      const res = await fetch("/api/admin/packages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, paymentStatus })
      });
      if (res.ok) {
        setPackages((prev) =>
          prev.map((p) => (p.id === id ? { ...p, paymentStatus } : p))
        );
      }
    } catch (err) {
      console.error("Update payment error:", err);
    }
  }

  async function updateInvoiceStatus(id: string, invoiceStatus: "draft" | "sent" | "paid") {
    try {
      const res = await fetch("/api/admin/packages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, invoiceStatus })
      });
      if (res.ok) {
        setPackages((prev) =>
          prev.map((p) => (p.id === id ? { ...p, invoiceStatus } : p))
        );
      }
    } catch (err) {
      console.error("Update invoice error:", err);
    }
  }

  async function handleCreatePackage(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientPhone,
          clientEmail,
          clientRole,
          packageType,
          agreedPrice: Number(agreedPrice) || 0,
          durationDays: Number(durationDays) || 30,
          deliverables,
          notes
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        setClientName("");
        setClientPhone("");
        setClientEmail("");
        setDeliverables("");
        setNotes("");
        setAgreedPrice("0");
        void loadPackages();
      }
    } catch (err) {
      console.error("Create package error:", err);
    } finally {
      setBusy(false);
    }
  }

  async function deletePackage(id: string) {
    if (!window.confirm("Permanently delete this service package record?")) return;
    try {
      const res = await fetch(`/api/admin/packages?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        setPackages((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error("Delete package error:", err);
    }
  }

  return (
    <div className="admin-packages-view">
      <div className="view-header">
        <div>
          <span className="eyebrow">MONETIZATION &amp; ADVISORY PACKAGES</span>
          <h3>Service Packages &amp; Paid Management ({packages.length})</h3>
        </div>
        <button
          type="button"
          className="button button-dark button-small"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={15} /> Create Service Package
        </button>
      </div>

      <div className="packages-policy-strip">
        <ShieldCheck size={16} />
        <div>
          <strong>Transparent Pricing &amp; Offline Payment Policy:</strong>
          <span>
            Terraland collects fee payments directly via UPI / Bank transfer with GST/Manual receipts. No hidden brokerage deductions; all due diligence is conducted independently or via certified legal counsel.
          </span>
        </div>
      </div>

      {loading ? (
        <p className="admin-empty">Loading service packages…</p>
      ) : packages.length === 0 ? (
        <p className="admin-empty">No active service packages yet. Create a package to manage listing services or assistance agreements.</p>
      ) : (
        <div className="packages-grid">
          {packages.map((pkg) => (
            <div key={pkg.id} className="package-card">
              <div className="pkg-header">
                <div>
                  <span className={`pkg-role-pill ${pkg.clientRole}`}>{pkg.clientRole.toUpperCase()}</span>
                  <strong>{pkg.clientName}</strong>
                  <span className="pkg-contact">{pkg.clientPhone}</span>
                </div>

                <div className="pkg-price-badge">
                  <strong>₹{pkg.agreedPrice.toLocaleString("en-IN")}</strong>
                  <small>{pkg.durationDays} days duration</small>
                </div>
              </div>

              <div className="pkg-type-title">
                <FileCheck size={14} />
                <span>Package: <strong>{packageTypes.find((t) => t.value === pkg.packageType)?.label || pkg.packageType}</strong></span>
              </div>

              {pkg.propertyTitle && (
                <div className="pkg-property-strip">
                  Property: {pkg.propertyTitle} ({pkg.locality})
                </div>
              )}

              <div className="pkg-status-row">
                <div className="status-unit">
                  <label>Invoice Status:</label>
                  <select
                    value={pkg.invoiceStatus}
                    onChange={(e) => void updateInvoiceStatus(pkg.id, e.target.value as "draft" | "sent" | "paid")}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent to Client</option>
                    <option value="paid">Invoice Settled</option>
                  </select>
                </div>

                <div className="status-unit">
                  <label>Payment Status:</label>
                  <select
                    value={pkg.paymentStatus}
                    onChange={(e) => void updatePaymentStatus(pkg.id, e.target.value as "unpaid" | "paid" | "waived")}
                    className={`pay-select ${pkg.paymentStatus}`}
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid &amp; Confirmed</option>
                    <option value="waived">Waived (Launch Promo)</option>
                  </select>
                </div>
              </div>

              {pkg.deliverables && (
                <div className="pkg-deliverables">
                  <strong>Agreed Deliverables:</strong>
                  <p>{pkg.deliverables}</p>
                </div>
              )}

              {pkg.notes && (
                <div className="pkg-notes">
                  <strong>Internal Notes:</strong>
                  <p>{pkg.notes}</p>
                </div>
              )}

              <div className="pkg-footer">
                <span>Created: {pkg.createdAt?.slice(0, 10)}</span>
                <button
                  type="button"
                  className="delete-icon-btn"
                  onClick={() => void deletePackage(pkg.id)}
                  title="Delete package"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreatePackage} className="modal-form">
              <h3>Create Service Package Agreement</h3>
              <p>Record a paid listing, site assistance, or negotiation agreement.</p>

              <label>
                Client Name <span className="req">*</span>
                <input
                  required
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. K. V. Rao"
                />
              </label>

              <div className="form-row">
                <label>
                  Client Phone <span className="req">*</span>
                  <input
                    required
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                  />
                </label>
                <label>
                  Client Role
                  <select
                    value={clientRole}
                    onChange={(e) => setClientRole(e.target.value as "seller" | "buyer")}
                  >
                    <option value="seller">Seller / Landowner</option>
                    <option value="buyer">Buyer</option>
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Package Type
                  <select value={packageType} onChange={(e) => setPackageType(e.target.value)}>
                    {packageTypes.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Agreed Fee (₹)
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={agreedPrice}
                    onChange={(e) => setAgreedPrice(e.target.value)}
                    placeholder="0"
                  />
                </label>
              </div>

              <label>
                Duration (Days)
                <input
                  type="number"
                  min="7"
                  max="365"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                />
              </label>

              <label>
                Agreed Deliverables
                <textarea
                  rows={2}
                  value={deliverables}
                  onChange={(e) => setDeliverables(e.target.value)}
                  placeholder="e.g. 5 accompanied site visits, physical boundary verification, and buyer price negotiation facilitation."
                />
              </label>

              <label>
                Internal Notes
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Advance paid ₹2,500 via UPI; balance on first visit."
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
                  disabled={busy}
                >
                  {busy ? "Saving…" : "Save Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

