"use client";

import { useEffect, useRef, useState } from "react";
import type { Property } from "@/lib/market";
import { ListingClassificationFields } from "@/components/listing-classification-fields";
import { ConfirmDialog } from "@/components/confirm-dialog";
import Link from "next/link";
import { Download, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

type AdminUser = { id: string; name: string; email: string; phone: string; createdAt: string; listingCount: number };
type AdminInquiry = {
  id: string;
  propertyId: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
  propertyTitle: string;
  emailStatus: "pending" | "sent" | null;
};
type InquiryEmailNotification = { id: string; status: "pending" | "sent"; attempts: number; lastError: string | null; createdAt: string; propertyTitle: string };
type AdminReview = {
  id: string;
  propertyId: string;
  userId: string | null;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string | null;
  propertyTitle: string;
};
type SellerPhoneClick = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  sellerName: string;
  userId: string;
  userName: string;
  userPhone: string;
  visitorId: string;
  createdAt: string;
  contactMethod: "phone" | "whatsapp";
  visitorProfileId: string | null;
  sellerId: string | null;
};
type MemberActivity = {
  id: string;
  userId: string;
  action: string;
  details: string;
  propertyId: string | null;
  propertyTitle: string | null;
  createdAt: string;
};
type RegistrationNotification = {
  id: string;
  name: string;
  email: string;
  status: "pending" | "sent";
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
};
type DashboardData = {
  users: AdminUser[];
  properties: Property[];
  inquiries: AdminInquiry[];
  inquiryNotifications: InquiryEmailNotification[];
  reviews: AdminReview[];
  phoneClicks: SellerPhoneClick[];
  memberActivity: MemberActivity[];
  registrationNotifications: RegistrationNotification[];
  settings: { showSellerPhones: boolean };
};

function formatAdminDate(value: string) {
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  return new Date(normalized).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" });
}


export function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({ users: [], properties: [], inquiries: [], inquiryNotifications: [], reviews: [], phoneClicks: [], memberActivity: [], registrationNotifications: [], settings: { showSellerPhones: true } });
  const [section, setSection] = useState<"properties" | "users" | "inquiries" | "reviews" | "phoneClicks">("properties");
  const [profileFocusId, setProfileFocusId] = useState("");
  const [listingTab, setListingTab] = useState<"sale" | "rent" | "hidden" | "pending">("sale");
  const listingsRef = useRef<HTMLDivElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [retryingEmail, setRetryingEmail] = useState(false);
  const [retryingInquiryEmail, setRetryingInquiryEmail] = useState(false);
  const [savingPhoneSetting, setSavingPhoneSetting] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupError, setBackupError] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ type: "user" | "property" | "inquiry" | "review"; id: string } | null>(null);

  function reviewPendingListings() {
    setSection("properties");
    setListingTab("pending");
    window.requestAnimationFrame(() => listingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function load() {
    setError("");
    try {
      const response = await fetch("/api/admin", { cache: "no-store" });
      const responseText = await response.text();
      let result: (DashboardData & { error?: string }) | { error?: string };
      try {
        result = JSON.parse(responseText) as DashboardData & { error?: string };
      } catch {
        throw new Error(response.ok ? "The dashboard returned an unreadable response. Refresh and try again." : `The dashboard request failed (${response.status}). Refresh and try again.`);
      }
      if (!response.ok) throw new Error(result.error ?? "The dashboard could not be loaded.");
      if (!("properties" in result) || !("phoneClicks" in result)) throw new Error(result.error ?? "The dashboard data is incomplete. Refresh and try again.");
      setData(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The dashboard could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (section !== "users" || !profileFocusId) return;
    document.querySelector(`[data-admin-user-id="${CSS.escape(profileFocusId)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [section, profileFocusId, data.users]);

  function openUserProfile(userId: string) {
    setProfileFocusId(userId);
    setSection("users");
  }

  function activityForUser(userId: string) {
    return data.memberActivity.filter((activity) => activity.userId === userId);
  }

  async function update(type: "user" | "property", id: string, fields: Record<string, unknown>) {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: type, id, ...fields }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "The changes could not be saved.");
      setMessage(result.message ?? "Saved.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The changes could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  async function remove(type: "user" | "property" | "inquiry" | "review", id: string) {
    setError("");
    setMessage("");
    setPendingDelete({ type, id });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete;
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: type, id }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "The record could not be deleted.");
      setMessage(result.message ?? "Deleted.");
      setPendingDelete(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The record could not be deleted.");
    } finally {
      setBusyId("");
    }
  }

  async function keepListing(id: string) {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "property", action: "dismiss-deletion", id }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "The request could not be declined.");
      setMessage(result.message ?? "Deletion request declined.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The request could not be declined.");
    } finally {
      setBusyId("");
    }
  }

  async function toggleListingVisibility(id: string, visible: boolean) {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "property", action: "toggle-visibility", id, visible }) });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Listing visibility could not be updated.");
      setMessage(result.message ?? "Listing visibility updated.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Listing visibility could not be updated.");
    } finally {
      setBusyId("");
    }
  }

  async function toggleListingPhoneVisibility(id: string, visible: boolean) {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "property", action: "toggle-phone-visibility", id, visible }) });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Listing phone visibility could not be updated.");
      setMessage(result.message ?? "Listing phone visibility updated.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Listing phone visibility could not be updated.");
    } finally {
      setBusyId("");
    }
  }

  async function toggleSellerPhones() {
    const value = !data.settings.showSellerPhones;
    setSavingPhoneSetting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "setting", key: "showSellerPhones", value }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "The phone visibility setting could not be updated.");
      setMessage(result.message ?? "Phone visibility updated.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The phone visibility setting could not be updated.");
    } finally {
      setSavingPhoneSetting(false);
    }
  }

  async function retryRegistrationEmails() {
    setRetryingEmail(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry-registration-emails" }),
      });
      const result = await response.json() as { sent?: number; failed?: number; pending?: number; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Queued emails could not be retried.");
      setMessage(`${result.sent ?? 0} email(s) sent; ${result.pending ?? 0} still queued.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Queued emails could not be retried.");
    } finally {
      setRetryingEmail(false);
    }
  }

  async function retryInquiryEmails() {
    setRetryingInquiryEmail(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry-inquiry-emails" }),
      });
      const result = await response.json() as { sent?: number; pending?: number; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Queued enquiry emails could not be retried.");
      setMessage(`${result.sent ?? 0} enquiry email(s) sent; ${result.pending ?? 0} still queued.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Queued enquiry emails could not be retried.");
    } finally {
      setRetryingInquiryEmail(false);
    }
  }

  async function downloadBackup() {
    setBackupBusy(true);
    setBackupError("");
    setBackupMessage("");
    try {
      const response = await fetch("/api/admin/backup", { method: "HEAD", cache: "no-store" });
      if (!response.ok) throw new Error("Your admin session expired. Sign in again and retry the download.");
      const link = document.createElement("a");
      link.href = "/api/admin/backup";
      document.body.append(link);
      link.click();
      link.remove();
      setBackupMessage("Backup download started directly to your device. Wait for it to finish before uploading the .gz file.");
    } catch (reason) {
      setBackupError(reason instanceof Error ? reason.message : "The backup could not be downloaded.");
    } finally {
      setBackupBusy(false);
    }
  }

  async function uploadBackup(file: File | undefined) {
    if (!file) return;
    if (!window.confirm("Restore this backup? It will replace the current site data and listing media.")) {
      if (backupInputRef.current) backupInputRef.current.value = "";
      return;
    }
    setBackupBusy(true);
    setBackupError("");
    setBackupMessage("");
    try {
      const response = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: file,
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "The backup could not be restored.");
      setBackupMessage(`${result.message ?? "Backup restored."} Refreshing the dashboard…`);
      window.setTimeout(() => router.replace("/sign-in?next=%2Fadmin"), 1200);
    } catch (reason) {
      setBackupError(reason instanceof Error ? reason.message : "The backup could not be restored.");
    } finally {
      setBackupBusy(false);
      if (backupInputRef.current) backupInputRef.current.value = "";
    }
  }

  return <section className="admin-content">
    {pendingDelete && <ConfirmDialog title="Delete this record?" description="This action cannot be undone. The selected record will be permanently deleted." confirmLabel="Delete permanently" error={error} busy={busyId === pendingDelete.id} onCancel={() => setPendingDelete(null)} onConfirm={() => void confirmDelete()} />}
    <div className="admin-setting-card">
      <div><strong>Site-wide seller contact visibility</strong><p>This overall switch overrides every listing. When it is on, each listing&apos;s phone visibility switch controls whether its number appears. When it is off, seller contact details are hidden across the website and enquiries go to NILAY.</p></div>
      <button type="button" className={`admin-setting-toggle${data.settings.showSellerPhones ? " is-on" : ""}`} aria-pressed={data.settings.showSellerPhones} disabled={savingPhoneSetting} onClick={() => void toggleSellerPhones()}>
        <span aria-hidden="true" />{savingPhoneSetting ? "Saving…" : data.settings.showSellerPhones ? "ON · Direct contact" : "OFF · NILAY connects"}
      </button>
    </div>
    <section className="admin-backup-card" aria-labelledby="admin-backup-title">
      {backupError && <div className="admin-backup-feedback is-error" role="alert">{backupError}</div>}
      {backupMessage && <div className="admin-backup-feedback" role="status">{backupMessage}</div>}
      <div className="admin-backup-copy"><span className="eyebrow">DATA PROTECTION</span><h2 id="admin-backup-title">Site backup</h2><p>Stream a portable copy of all site data and listing photos/videos to your device. Upload the completed .gz file to restore it.</p></div>
      <div className="admin-backup-actions">
        <input ref={backupInputRef} className="admin-backup-file" type="file" accept=".gz,.json,.terraland-backup,application/gzip,application/json" aria-label="Choose a Terraland backup file" disabled={backupBusy} onChange={(event) => void uploadBackup(event.currentTarget.files?.[0])} />
        <button className="admin-backup-button admin-backup-upload" type="button" disabled={backupBusy} onClick={() => backupInputRef.current?.click()}><Upload size={16} aria-hidden="true" />{backupBusy ? "Working…" : "Upload backup"}</button>
        <button className="admin-backup-button admin-backup-download" type="button" disabled={backupBusy} onClick={() => void downloadBackup()}><Download size={16} aria-hidden="true" />Download backup</button>
      </div>
    </section>
    {data.registrationNotifications.some((notice) => notice.status === "pending") && <div className="admin-email-alert">
      <div><strong>Registration emails are queued</strong><p>New accounts can sign in. Configure a Resend API key and verified sender to deliver notices to pavansai580@gmail.com.</p></div>
      <button className="button button-dark" type="button" disabled={retryingEmail} onClick={() => void retryRegistrationEmails()}>{retryingEmail ? "Retrying…" : "Retry queued emails"}</button>
    </div>}
    {data.inquiryNotifications.some((notice) => notice.status === "pending") && <div className="admin-email-alert">
      <div><strong>Enquiry emails are queued</strong><p>Configure the Resend sender and API key to deliver saved buyer enquiries to pavansai580@gmail.com.</p></div>
      <button className="button button-dark" type="button" disabled={retryingInquiryEmail} onClick={() => void retryInquiryEmails()}>{retryingInquiryEmail ? "Retrying…" : "Retry enquiry emails"}</button>
    </div>}
    {data.properties.some((property) => property.deleteRequestedAt) && <div className="admin-email-alert">
      <div><strong>{data.properties.filter((property) => property.deleteRequestedAt).length} listing deletion request(s) need your approval</strong><p>Requested listings stay online until you approve deletion from the listings panel.</p></div>
      <button className="button button-dark" type="button" onClick={reviewPendingListings}>Review listings</button>
    </div>}
    <Link className="admin-analytics-link" href="/admin/analytics"><span><span className="eyebrow">VISITOR ANALYTICS</span><strong>Daily and monthly visitor graphs</strong><small>View clear traffic summaries and manage recorded analytics.</small></span><span aria-hidden="true">↗</span></Link>
    <div className="admin-stats">
      <button className={section === "properties" ? "is-active" : ""} onClick={() => setSection("properties")}><span>LISTINGS</span><strong>{data.properties.length}</strong></button>
      <button className={section === "users" ? "is-active" : ""} onClick={() => setSection("users")}><span>MEMBERS</span><strong>{data.users.filter((user) => user.email !== "pavansai580@gmail.com").length}</strong></button>
      <button className={section === "inquiries" ? "is-active" : ""} onClick={() => setSection("inquiries")}><span>ENQUIRIES</span><strong>{data.inquiries.length}</strong></button>
      <button className={section === "reviews" ? "is-active" : ""} onClick={() => setSection("reviews")}><span>REVIEWS</span><strong>{data.reviews.length}</strong></button>
      <button className={section === "phoneClicks" ? "is-active" : ""} onClick={() => setSection("phoneClicks")}><span>PHONE & WHATSAPP</span><strong>{data.phoneClicks.length}</strong></button>
    </div>
    {error && !pendingDelete && <div className="form-error" role="alert">{error}</div>}
    {message && <div className="admin-success" role="status">{message}</div>}
    {loading ? <p className="admin-empty">Loading site records…</p> : <>
      {section === "properties" && <>
        <div className="listing-admin-tabs">
          <div className="listing-admin-segment" role="tablist" aria-label="Listing type">
            {([["sale", "For sale"], ["rent", "For rent"]] as const).map(([tab, label]) => {
              const count = data.properties.filter((property) => property.status !== "hidden" && (property.listingCategory ?? "sale") === tab).length;
              return <button key={tab} type="button" role="tab" aria-selected={listingTab === tab} className={listingTab === tab ? "is-active" : ""} onClick={() => setListingTab(tab)}>{label} <span>{count}</span></button>;
            })}
          </div>
          <button type="button" className={listingTab === "hidden" ? "hidden-is-active" : ""} aria-pressed={listingTab === "hidden"} onClick={() => setListingTab("hidden")}>Hidden listings <span>{data.properties.filter((property) => property.status === "hidden").length}</span></button>
          <button type="button" className={listingTab === "pending" ? "pending-is-active" : ""} aria-pressed={listingTab === "pending"} onClick={() => setListingTab("pending")}>Pending approval <span>{data.properties.filter((property) => property.deleteRequestedAt).length}</span></button>
        </div>
        <div className="admin-record-list" ref={listingsRef}>{data.properties.filter((property) => listingTab === "hidden" ? property.status === "hidden" : listingTab === "pending" ? Boolean(property.deleteRequestedAt) : property.status !== "hidden" && (property.listingCategory ?? "sale") === listingTab).map((property) =>
        <details className="admin-listing-details" key={property.id} open={Boolean(property.deleteRequestedAt && listingTab === "pending")}>
        <summary className="admin-listing-summary"><span><span className="eyebrow">{property.deleteRequestedAt ? "DELETION REQUEST AWAITING APPROVAL" : listingTab === "rent" ? "FOR RENT" : "FOR SALE"} · {property.type}</span><strong>{property.title}</strong><span className="admin-listing-meta">{property.city} · {property.locality} · ₹{Number(property.price).toLocaleString("en-IN")} · {property.area} {property.unit}</span><span className="admin-listing-meta">Listed {property.createdAt ? formatAdminDate(property.createdAt) : "time unavailable"}</span></span><span className="admin-listing-open">Open details</span></summary>
        <form className="admin-record" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void update("property", property.id, {
            title: form.get("title"), type: form.get("type"), city: form.get("city"), locality: form.get("locality"),
            owner: form.get("owner"), phone: form.get("phone"), price: form.get("price"), area: form.get("area"),
            unit: form.get("unit"), badge: form.get("badge"), description: form.get("description"),
            listingCategory: form.get("listingCategory"), pricePeriod: form.get("pricePeriod"),
            availability: form.get("availability"), guestCapacity: form.get("guestCapacity"),
            verified: form.get("verified") === "on", status: property.status ?? "published",
            images: String(form.get("images") ?? "").split(/\r?\n/).map((image) => image.trim()).filter(Boolean),
            facing: form.get("facing"), approvals: form.get("approvals"),
            loanAvailable: form.get("loanAvailable"), registrationAvailable: form.get("registrationAvailable"),
            renovation: form.get("renovation"), cornerPlot: form.get("cornerPlot"), roadWidth: form.get("roadWidth"),
            surveyNumber: form.get("surveyNumber"), soilType: form.get("soilType"), clearTitle: form.get("clearTitle"),
            amenities: String(form.get("amenities") ?? "").split(/\r?\n|,/).map((amenity) => amenity.trim()).filter(Boolean),
            address: form.get("address"), landmark: form.get("landmark"), mapUrl: form.get("mapUrl"),
          });
        }}>
          <div className="admin-record-top"><div><span className="eyebrow">{property.deleteRequestedAt ? "DELETION REQUEST · AWAITING YOUR APPROVAL · " : "LISTING · "}{property.listingCategory === "rent" ? "FOR RENT" : "FOR SALE"} · {property.type} · {property.id.slice(0, 8)}</span><strong translate="no">{property.title}</strong></div><div className="admin-record-actions">{property.deleteRequestedAt && <button type="button" className="text-link" disabled={busyId === property.id} onClick={() => void keepListing(property.id)}>Keep listing</button>}<button type="button" className="admin-delete" disabled={busyId === property.id} onClick={() => void remove("property", property.id)}>{property.deleteRequestedAt ? "Approve & delete" : "Delete listing"}</button></div></div>
          <div className="admin-form-grid">
            <label>Title<input name="title" required defaultValue={property.title} /></label>
            <ListingClassificationFields category={property.listingCategory ?? "sale"} type={property.type} pricePeriod={property.pricePeriod ?? "total"}
              categoryFields={(category) => category === "rent" ? <>
                <label className="admin-wide">Availability / rental terms<input name="availability" maxLength={240} defaultValue={property.availability ?? ""} /></label>
                <label>Guest capacity<input name="guestCapacity" type="number" min="1" max="1000" step="1" defaultValue={property.guestCapacity ?? ""} /></label>
              </> : <>
                <label>Facing<input name="facing" maxLength={40} defaultValue={property.facing ?? ""} /></label>
                <label>Approvals<input name="approvals" maxLength={120} defaultValue={property.approvals ?? ""} /></label>
                <label>Road width<input name="roadWidth" maxLength={40} defaultValue={property.roadWidth ?? ""} /></label>
                <label>Survey number<input name="surveyNumber" maxLength={80} defaultValue={property.surveyNumber ?? ""} /></label>
                <label>Soil type<input name="soilType" maxLength={80} defaultValue={property.soilType ?? ""} /></label>
                <label>Renovation / condition<input name="renovation" maxLength={120} defaultValue={property.renovation ?? ""} /></label>
                <label>Loan available<select name="loanAvailable" defaultValue={property.loanAvailable ?? ""}><option value="">Not specified</option><option value="yes">Yes</option><option value="no">No</option></select></label>
                <label>Registration available<select name="registrationAvailable" defaultValue={property.registrationAvailable ?? ""}><option value="">Not specified</option><option value="yes">Yes</option><option value="no">No</option></select></label>
                <label>Corner plot<select name="cornerPlot" defaultValue={property.cornerPlot ?? ""}><option value="">Not specified</option><option value="yes">Yes</option><option value="no">No</option></select></label>
                <label>Clear title<select name="clearTitle" defaultValue={property.clearTitle ?? ""}><option value="">Not specified</option><option value="yes">Yes</option><option value="no">No</option></select></label>
              </>}
            />
            <label>City / state<input name="city" required defaultValue={property.city} /></label>
            <label>Locality<input name="locality" required defaultValue={property.locality} /></label>
            <label>Owner name<input name="owner" required defaultValue={property.owner} /></label>
            <label>Phone<input name="phone" required defaultValue={property.phone} /></label>
            <label>Price or rate (₹)<input name="price" type="number" min="1" required defaultValue={property.price} /></label>
            <label>Area<input name="area" type="text" inputMode="decimal" maxLength={80} required defaultValue={property.area} /></label>
            <label>Area unit<input name="unit" required defaultValue={property.unit} /></label>
            <label className="admin-wide">Amenities (one per line)<textarea name="amenities" rows={2} defaultValue={(property.amenities ?? []).join("\n")} /></label>
            <label className="admin-wide">Property address<input name="address" maxLength={240} defaultValue={property.address ?? ""} /></label>
            <label className="admin-wide">Nearby landmark<input name="landmark" maxLength={120} defaultValue={property.landmark ?? ""} /></label>
            <label className="admin-wide">Google Maps location URL<input name="mapUrl" type="url" maxLength={500} defaultValue={property.mapUrl ?? ""} placeholder="https://maps.app.goo.gl/..." /></label>
            <label>Badge<input name="badge" required defaultValue={property.badge} /></label>
            <button type="button" className="admin-visibility-button" disabled={busyId === property.id} onClick={() => void toggleListingVisibility(property.id, property.status === "hidden")}>{property.status === "hidden" ? "Show this listing on website" : "Hide this listing from website"}</button>
            <button type="button" className="admin-visibility-button" aria-pressed={property.showPhone !== false} disabled={busyId === property.id} onClick={() => void toggleListingPhoneVisibility(property.id, property.showPhone === false)}>{property.showPhone === false ? "Show phone on this listing" : "Hide phone on this listing"}</button>
            <label className="admin-checkbox">Verified seller<input type="checkbox" name="verified" defaultChecked={property.verified} /></label>
            <label className="admin-wide">Photo URLs (one per line)<textarea name="images" rows={3} defaultValue={(property.images ?? [property.image]).join("\n")} /></label>
            <label className="admin-wide">Description<textarea name="description" rows={3} required defaultValue={property.description} /></label>
          </div>
          <button className="button button-dark admin-save" disabled={busyId === property.id}>{busyId === property.id ? "Saving…" : "Save listing"}</button>
        </form>
        </details>
      )}{!data.properties.some((property) => listingTab === "hidden" ? property.status === "hidden" : listingTab === "pending" ? Boolean(property.deleteRequestedAt) : property.status !== "hidden" && (property.listingCategory ?? "sale") === listingTab) && <p className="admin-empty">{listingTab === "hidden" ? "There are no hidden listings." : listingTab === "pending" ? "No listing deletion requests are waiting for approval." : `No visible ${listingTab === "sale" ? "sale" : "rental"} listings yet.`}</p>}</div>
      </>}
      {section === "users" && <div className="admin-record-list">{data.users.filter((user) => user.email !== "pavansai580@gmail.com" || user.id === profileFocusId).map((user) =>
        <form className={`admin-record admin-user-record${user.id === profileFocusId ? " is-profile-focus" : ""}`} data-admin-user-id={user.id} key={user.id} onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void update("user", user.id, { name: form.get("name"), email: form.get("email") });
        }}>
          <div className="admin-record-top"><div><span className="eyebrow">{user.listingCount} LISTINGS · ACCOUNT CREATED {formatAdminDate(user.createdAt)}</span><strong>{user.name}</strong><span>{user.phone ? <a href={`tel:${user.phone}`}>{user.phone}</a> : "Phone number not added"}</span></div>{user.email !== "pavansai580@gmail.com" && <button type="button" className="admin-delete" disabled={busyId === user.id} onClick={() => void remove("user", user.id)}>Delete account</button>}</div>
          <div className="admin-form-grid"><label>Name<input name="name" required defaultValue={user.name} /></label><label>Email <span className="optional-label">optional</span><input name="email" type="email" defaultValue={user.email} placeholder="No email; phone login only" /></label></div>
          <button className="button button-dark admin-save" disabled={busyId === user.id}>{busyId === user.id ? "Saving…" : "Save member"}</button>
          <details className="member-activity" open={user.id === profileFocusId}>
            <summary>Full activity log · {activityForUser(user.id).length} events</summary>
            {activityForUser(user.id).length ? <ol>{activityForUser(user.id).map((activity) => <li key={activity.id}>
              <time dateTime={activity.createdAt}>{formatAdminDate(activity.createdAt)}</time>
              <strong>{activity.action}</strong>
              {(activity.propertyTitle || activity.details) && <span>{[activity.propertyTitle, activity.details].filter(Boolean).join(" · ")}</span>}
            </li>)}</ol> : <p>No activity recorded for this member yet.</p>}
          </details>
        </form>
      )}</div>}
      {section === "inquiries" && <div className="admin-record-list">{data.inquiries.map((inquiry) =>
        <article className="admin-record admin-inquiry" key={inquiry.id}>
          <div className="admin-record-top"><div><span className="eyebrow">{inquiry.email ? "ACCOUNT ENQUIRY" : "LEGACY ENQUIRY"}{inquiry.emailStatus ? ` · EMAIL ${inquiry.emailStatus.toUpperCase()}` : ""} · {formatAdminDate(inquiry.createdAt)}</span><strong>{inquiry.propertyTitle}</strong></div><button type="button" className="admin-delete" disabled={busyId === inquiry.id} onClick={() => void remove("inquiry", inquiry.id)}>Delete</button></div>
          <div className="admin-inquiry-contact"><strong>{inquiry.name}</strong>{inquiry.email ? <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a> : <span>Email not available</span>}{inquiry.phone && <a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a>}<span>{inquiry.userId ? "Account linked" : inquiry.email ? "Account removed; contact snapshot retained" : "Submitted before account sign-in was required"}</span></div>
          <p>{inquiry.message}</p>
        </article>
      )}</div>}
      {section === "reviews" && <div className="admin-record-list">{data.reviews.length ? data.reviews.map((review) =>
        <article className="admin-record admin-review" key={review.id}>
          <div className="admin-record-top"><div><span className="eyebrow">{review.reviewerName} · {review.rating}/5 · {formatAdminDate(review.updatedAt ?? review.createdAt)}</span><strong>{review.propertyTitle}</strong></div><button type="button" className="admin-delete" disabled={busyId === review.id} onClick={() => void remove("review", review.id)}>Delete review</button></div>
          <p>{review.comment}</p>
        </article>
      ) : <p className="admin-empty">No reviews have been posted yet.</p>}</div>}
      {section === "phoneClicks" && <div className="admin-record-list">{data.phoneClicks.length ? data.phoneClicks.map((click) =>
        <article className="admin-record admin-phone-click" key={click.id}>
          <div className="admin-record-top"><div><span className="eyebrow">{formatAdminDate(click.createdAt)} · {click.contactMethod === "whatsapp" ? "WHATSAPP TO 8074399963" : "PHONE NUMBER CLICK"} · {click.userId ? "SIGNED-IN USER" : "GUEST VISITOR"}</span><strong>{click.propertyTitle}</strong></div><Link className="text-link" href={`/properties/${encodeURIComponent(click.propertyId)}`} target="_blank">View listing</Link></div>
          <div className="admin-inquiry-contact"><span>Visitor: {click.visitorProfileId ? <button type="button" className="admin-profile-link" onClick={() => openUserProfile(click.visitorProfileId!)}>{click.userName || "View visitor profile"}</button> : <strong>{click.userName || `Guest ${click.visitorId.slice(0, 8)}`}</strong>}</span>{click.userPhone && <span>Phone: {click.userPhone}</span>}<span>Seller: {click.sellerId ? <button type="button" className="admin-profile-link" onClick={() => openUserProfile(click.sellerId!)}>{click.sellerName}</button> : <strong>{click.sellerName}</strong>}</span></div>
        </article>
      ) : <p className="admin-empty">No seller phone clicks have been recorded yet.</p>}</div>}
      {section === "users" && <section className="admin-record-list admin-notifications">
        <h2>Registration email delivery</h2>
        {data.registrationNotifications.length ? data.registrationNotifications.map((notice) => <article className="admin-record" key={notice.id}>
          <div className="admin-record-top"><div><span className="eyebrow">{notice.status === "sent" ? `SENT ${notice.sentAt ? new Date(notice.sentAt).toLocaleString() : ""}` : "QUEUED"}</span><strong>{notice.name}</strong></div><span>{notice.email}</span></div>
          {notice.status === "pending" && <p>Attempts: {notice.attempts}. {notice.lastError ?? "Waiting for mail configuration."}</p>}
        </article>) : <p className="admin-empty">No registration notifications yet.</p>}
      </section>}
    </>}
  </section>;
}
