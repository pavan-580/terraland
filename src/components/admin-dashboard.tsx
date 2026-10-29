"use client";

import { useEffect, useRef, useState } from "react";
import { formatListingPrice, type Property } from "@/lib/market";
import { BrandLogo } from "@/components/brand-logo";
import { ListingClassificationFields } from "@/components/listing-classification-fields";
import { ConfirmDialog } from "@/components/confirm-dialog";
import Link from "next/link";
import { ArrowUpRight, Download, Upload, Megaphone, Sparkles, Share2, Copy, Check, Eye, Users, Home, TrendingUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminDailySummary } from "@/components/admin/admin-daily-summary";
import { AdminLeadsCrm } from "@/components/admin/admin-leads-crm";
import { AdminRequirementsView } from "@/components/admin/admin-requirements-view";
import { AdminSiteVisitsView } from "@/components/admin/admin-site-visits-view";
import { AdminMatchesView } from "@/components/admin/admin-matches-view";
import { AdminPackagesView } from "@/components/admin/admin-packages-view";

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
type SiteActivity = {
  id: string;
  userId: string | null;
  actorName: string;
  visitorId: string;
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
  siteActivity: SiteActivity[];
  registrationNotifications: RegistrationNotification[];
  settings: {
    showSellerPhones: boolean;
    adminContactPhone?: string;
    customerCarePhone?: string;
    customerCareEmail?: string;
    homeTickerText: string;
    homeTickerPropertyId: string;
    popupAdEnabled: boolean;
    popupAdPropertyId: string;
    popupAdKicker: string;
    popupAdTitle: string;
    popupAdDate: string;
    popupAdBody: string;
    popupAdImage: string;
    announcementEnabled: boolean;
    announcementText: string;
    resendApiKey?: string;
    emailFrom?: string;
    adminNotificationEmail?: string;
    siteLogoUrl?: string;
    siteBaseUrl?: string;
  };
};

function formatAdminDate(value: string) {
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  return new Date(normalized).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" });
}

function readMediaArray(value: FormDataEntryValue | null): string[] {
  try {
    const parsed: unknown = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function AdminListingMediaManager({ title, initialImages, initialVideos, disabled }: {
  title: string;
  initialImages: string[];
  initialVideos: string[];
  disabled: boolean;
}) {
  const [images, setImages] = useState(initialImages);
  const [videos, setVideos] = useState(initialVideos);
  const [preview, setPreview] = useState<{ type: "photo" | "video"; src: string; index: number } | null>(null);

  function removeMedia(type: "photo" | "video", index: number) {
    if (type === "photo") setImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
    else setVideos((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setPreview(null);
  }

  return (
    <section className="admin-media-manager admin-wide" aria-label={`Photos and videos for ${title}`}>
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="videos" value={JSON.stringify(videos)} />
      <div className="admin-media-heading">
        <div>
          <strong>Listing photos &amp; videos</strong>
          <span>{images.length} photos · {videos.length} videos</span>
          <small>Scroll sideways to browse. Tap media to preview; remove it, then save the listing.</small>
        </div>
      </div>
      {images.length + videos.length ? (
        <div className="admin-media-strip">
          {images.map((src, index) => (
            <article className="admin-media-tile" key={`photo-${src}-${index}`}>
              <button type="button" className="admin-media-preview" onClick={() => setPreview({ type: "photo", src, index })} aria-label={`Preview photo ${index + 1}`}>
                <img src={src} alt={`Listing photo ${index + 1}`} loading="lazy" />
              </button>
              <span>Photo {index + 1}</span>
              <button type="button" className="admin-media-remove" disabled={disabled} onClick={() => removeMedia("photo", index)}>Remove photo</button>
            </article>
          ))}
          {videos.map((src, index) => (
            <article className="admin-media-tile" key={`video-${src}-${index}`}>
              <button type="button" className="admin-media-preview" onClick={() => setPreview({ type: "video", src, index })} aria-label={`Play video ${index + 1}`}>
                <video src={src} muted playsInline preload="metadata" />
                <span className="admin-media-play" aria-hidden="true">▶</span>
              </button>
              <span>Video {index + 1}</span>
              <button type="button" className="admin-media-remove" disabled={disabled} onClick={() => removeMedia("video", index)}>Remove video</button>
            </article>
          ))}
        </div>
      ) : (
        <p className="admin-media-empty">This listing has no photos or videos.</p>
      )}
      {preview && (
        <div className="admin-media-lightbox" role="dialog" aria-modal="true" aria-label={`${preview.type === "photo" ? "Photo" : "Video"} preview`} onClick={() => setPreview(null)}>
          <div className="admin-media-lightbox-content" onClick={(event) => event.stopPropagation()}>
            <div className="admin-media-lightbox-heading">
              <strong>{title} · {preview.type} {preview.index + 1}</strong>
              <button type="button" aria-label="Close preview" onClick={() => setPreview(null)}>×</button>
            </div>
            {preview.type === "photo" ? (
              <img className="admin-media-large-image" src={preview.src} alt={`${title} photo ${preview.index + 1}`} />
            ) : (
              <video className="admin-media-large-video" src={preview.src} controls playsInline autoPlay />
            )}
            <button type="button" className="admin-media-remove" disabled={disabled} onClick={() => removeMedia(preview.type, preview.index)}>Remove this {preview.type}</button>
          </div>
        </div>
      )}
    </section>
  );
}

export function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({
    users: [],
    properties: [],
    inquiries: [],
    inquiryNotifications: [],
    reviews: [],
    phoneClicks: [],
    memberActivity: [],
    siteActivity: [],
    registrationNotifications: [],
    settings: {
      showSellerPhones: true,
      adminContactPhone: "8074399963",
      customerCarePhone: "8074399963",
      customerCareEmail: "care@nilay.in",
      homeTickerText: "New verified plots are added after owner and site checks.",
      homeTickerPropertyId: "",
      popupAdEnabled: false,
      popupAdPropertyId: "",
      popupAdKicker: "IMPORTANT ANNOUNCEMENT",
      popupAdTitle: "",
      popupAdDate: "",
      popupAdBody: "",
      popupAdImage: "",
      announcementEnabled: false,
      announcementText: "",
    },
  });
  const [section, setSection] = useState<"leads" | "properties" | "requirements" | "visits" | "matches" | "packages" | "users" | "inquiries" | "reviews" | "phoneClicks" | "activity" | "ads" | "rolling">("leads");
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
  const [adminPhone, setAdminPhone] = useState("8074399963");
  const [carePhone, setCarePhone] = useState("8074399963");
  const [careEmail, setCareEmail] = useState("care@nilay.in");
  const [savingContacts, setSavingContacts] = useState(false);
  const [tickerText, setTickerText] = useState("New verified plots are added after owner and site checks.");
  const [tickerPropertyId, setTickerPropertyId] = useState("");
  const [savingTicker, setSavingTicker] = useState(false);
  const [popupEnabled, setPopupEnabled] = useState(false);
  const [popupListingId, setPopupListingId] = useState("");
  const [popupKicker, setPopupKicker] = useState("IMPORTANT ANNOUNCEMENT");
  const [popupTitle, setPopupTitle] = useState("");
  const [popupDate, setPopupDate] = useState("");
  const [popupBody, setPopupBody] = useState("");
  const [popupImage, setPopupImage] = useState("");
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [savingPopup, setSavingPopup] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupError, setBackupError] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ type: "user" | "property" | "inquiry" | "review"; id: string } | null>(null);

  // Quick Promotion & Ad Helpers
  const [selectedPromoPlotId, setSelectedPromoPlotId] = useState("");
  const [copiedPromo, setCopiedPromo] = useState(false);
  const [showLivePopupModal, setShowLivePopupModal] = useState(false);
  const [focusedListingId, setFocusedListingId] = useState("");

  // Email delivery & Branding State
  const [resendApiKey, setResendApiKey] = useState("");
  const [emailFrom, setEmailFrom] = useState("NILAY <onboarding@resend.dev>");
  const [adminNotificationEmail, setAdminNotificationEmail] = useState("pavansai580@gmail.com");
  const [savingEmailSettings, setSavingEmailSettings] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState("");
  const [runningNurture, setRunningNurture] = useState(false);
  const [nurtureResult, setNurtureResult] = useState("");
  const [pushingAllEmails, setPushingAllEmails] = useState(false);
  const [siteLogoUrl, setSiteLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [siteBaseUrl, setSiteBaseUrl] = useState("");
  const [savingDomain, setSavingDomain] = useState(false);
  const [domainMessage, setDomainMessage] = useState("");
  const [currentOrigin, setCurrentOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setCurrentOrigin(window.location.origin);
  }, []);

  const scrollToElementAndFocus = (targetId: string, focusSelector?: string) => {
    const applyFocusAndScroll = (el: Element) => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      const inputToFocus = (focusSelector ? (el.querySelector(focusSelector) as HTMLElement | null) : null) ||
        (el.querySelector("input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled])") as HTMLElement | null) ||
        (el instanceof HTMLElement ? el : null);

      if (inputToFocus) {
        inputToFocus.focus({ preventScroll: true });
        inputToFocus.classList.add("admin-field-highlight");
        window.setTimeout(() => inputToFocus.classList.remove("admin-field-highlight"), 1800);
      }
    };

    // Try immediately for instant 0ms response
    const immediateEl = document.getElementById(targetId) || document.querySelector(targetId);
    if (immediateEl) {
      applyFocusAndScroll(immediateEl);
      return;
    }

    // If not in DOM yet (e.g. tab just switched), run on next animation frame
    requestAnimationFrame(() => {
      const el = document.getElementById(targetId) || document.querySelector(targetId);
      if (el) {
        applyFocusAndScroll(el);
      } else {
        window.setTimeout(() => {
          const delayedEl = document.getElementById(targetId) || document.querySelector(targetId);
          if (delayedEl) applyFocusAndScroll(delayedEl);
        }, 40);
      }
    });
  };

  const navigateToSection = (
    targetSection: typeof section,
    options?: {
      elementId?: string;
      focusSelector?: string;
      listingTab?: "sale" | "rent" | "hidden" | "pending";
      openListingId?: string;
    }
  ) => {
    setSection(targetSection);
    if (options?.listingTab) {
      setListingTab(options.listingTab);
    }
    if (options?.openListingId) {
      setFocusedListingId(options.openListingId);
    }

    const targetId = options?.elementId || `admin-section-${targetSection}`;
    scrollToElementAndFocus(targetId, options?.focusSelector);
  };

  const openAndFocusListing = (propertyId: string) => {
    setFocusedListingId(propertyId);
    scrollToElementAndFocus(`admin-listing-${propertyId}`, "input[name='title']");
  };

  const selectedPromoPlot = data.properties.find((p) => p.id === (selectedPromoPlotId || popupListingId)) ?? data.properties[0];

  function autoFillPopupFromPlot(plotId: string) {
    const plot = data.properties.find((p) => p.id === plotId);
    if (!plot) return;
    setPopupListingId(plot.id);
    setPopupTitle(plot.title);
    const priceFormatted = Number(plot.price) >= 10000000
      ? `₹${(Number(plot.price) / 10000000).toFixed(2)} Cr`
      : Number(plot.price) >= 100000
      ? `₹${(Number(plot.price) / 100000).toFixed(1)} Lakhs`
      : `₹${Number(plot.price).toLocaleString("en-IN")}`;
    setPopupBody(`${[plot.locality, plot.city].filter(Boolean).join(", ")} · ${priceFormatted} · ${plot.area} ${plot.unit}. Clear title plot verified by NILAY.`);
    if (plot.image) setPopupImage(plot.image);
    setPopupDate("Verified Listing · Limited Period");
  }

  function handleSelectPopupPlot(plotId: string) {
    setPopupListingId(plotId);
    const found = data.properties.find((p) => p.id === plotId);
    if (found) {
      if (!popupTitle) setPopupTitle(found.title);
      if (!popupBody) setPopupBody(`${[found.locality, found.city].filter(Boolean).join(", ")} · ₹${Number(found.price).toLocaleString("en-IN")} · ${found.area} ${found.unit}. Verified clear title plot.`);
      if (!popupImage && found.image) setPopupImage(found.image);
    }
  }

  function generateWhatsAppText(plot?: Property) {
    if (!plot) return "";
    const priceFormatted = Number(plot.price) >= 10000000
      ? `₹${(Number(plot.price) / 10000000).toFixed(2)} Cr`
      : Number(plot.price) >= 100000
      ? `₹${(Number(plot.price) / 100000).toFixed(1)} Lakhs`
      : `₹${Number(plot.price).toLocaleString("en-IN")}`;
    const siteUrl = siteBaseUrl || (typeof window !== "undefined" ? window.location.origin : "https://nkart.store");
    const link = `${siteUrl}/properties/${encodeURIComponent(plot.id)}`;

    return `🏡 *EXCLUSIVE PLOT FOR SALE - ${plot.locality?.toUpperCase() || "HYDERABAD"}, ${plot.city?.toUpperCase() || "TELANGANA"}*\n\n` +
      `🏷️ *Project:* ${plot.title}\n` +
      `💰 *Price:* ${priceFormatted} (${plot.listingCategory === "rent" ? "Rent" : "Total"})\n` +
      `📐 *Size:* ${plot.area} ${plot.unit}\n` +
      (plot.approvals ? `✅ *Approvals:* ${plot.approvals}\n` : "") +
      (plot.facing ? `🧭 *Facing:* ${plot.facing}\n` : "") +
      (plot.roadWidth ? `🛣️ *Road Width:* ${plot.roadWidth}\n` : "") +
      `✨ 100% Clear Title Documentation & Ready for Registration\n\n` +
      `📸 *View Full Photos, Video & Details:*\n${link}\n\n` +
      `📞 *Direct Site Visits & Negotiation:* Contact via NILAY Marketplace\n` +
      `🌐 *NILAY Real Estate Marketplace*`;
  }

  async function copyWhatsAppAd() {
    const text = generateWhatsAppText(selectedPromoPlot);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPromo(true);
      window.setTimeout(() => setCopiedPromo(false), 2500);
    } catch {
      /* fallback */
    }
  }

  function shareWhatsAppAd() {
    const text = generateWhatsAppText(selectedPromoPlot);
    if (!text) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function reviewPendingListings() {
    navigateToSection("properties", {
      listingTab: "pending",
      elementId: "admin-section-properties",
    });
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
      if (!("properties" in result) || !("phoneClicks" in result) || !("siteActivity" in result)) throw new Error(result.error ?? "The dashboard data is incomplete. Refresh and try again.");
      setData(result);
      setAdminPhone(result.settings.adminContactPhone ?? "8074399963");
      setCarePhone(result.settings.customerCarePhone ?? "8074399963");
      setCareEmail(result.settings.customerCareEmail ?? "care@nilay.in");
      setTickerText(result.settings.homeTickerText ?? "New verified plots are added after owner and site checks.");
      setTickerPropertyId(result.settings.homeTickerPropertyId ?? "");
      setPopupEnabled(result.settings.popupAdEnabled ?? false);
      setPopupListingId(result.settings.popupAdPropertyId ?? "");
      setPopupKicker(result.settings.popupAdKicker ?? "IMPORTANT ANNOUNCEMENT");
      setPopupTitle(result.settings.popupAdTitle ?? "");
      setPopupDate(result.settings.popupAdDate ?? "");
      setPopupBody(result.settings.popupAdBody ?? "");
      setPopupImage(result.settings.popupAdImage ?? "");
      setAnnouncementEnabled(result.settings.announcementEnabled ?? false);
      setAnnouncementText(result.settings.announcementText ?? "");
      setResendApiKey(result.settings.resendApiKey ?? "");
      setEmailFrom(result.settings.emailFrom ?? "NILAY <onboarding@resend.dev>");
      setAdminNotificationEmail(result.settings.adminNotificationEmail ?? "pavansai580@gmail.com");
      setSiteLogoUrl(result.settings.siteLogoUrl ?? "");
      setSiteBaseUrl(result.settings.siteBaseUrl ?? "");
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

    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "ads" || tab === "rolling" || tab === "leads" || tab === "properties") {
      setSection(tab);
    }
  }, []);

  useEffect(() => {

    if (section !== "users" || !profileFocusId) return;
    document.querySelector(`[data-admin-user-id="${CSS.escape(profileFocusId)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [section, profileFocusId, data.users]);

  function openUserProfile(userId: string) {
    setProfileFocusId(userId);
    navigateToSection("users", {
      elementId: `[data-admin-user-id="${CSS.escape(userId)}"]`,
      focusSelector: "input[name='name']",
    });
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
    if (type === "property") {
      setData((prev) => !prev ? prev : ({
        ...prev,
        properties: prev.properties.filter((p) => p.id !== id),
      }));
    }
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
    setData((prev) => !prev ? prev : ({
      ...prev,
      properties: prev.properties.map((p) => p.id === id ? { ...p, deleteRequestedAt: null } : p),
    }));
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

  async function approveListing(id: string) {
    setBusyId(id);
    setError("");
    setMessage("");
    setData((prev) => !prev ? prev : ({
      ...prev,
      properties: prev.properties.map((p) => p.id === id ? { ...p, status: "published", deleteRequestedAt: null } : p),
    }));
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "property", action: "approve", id }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Listing could not be approved.");
      setMessage(result.message ?? "Listing approved and published on website.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Listing could not be approved.");
      await load();
    } finally {
      setBusyId("");
    }
  }

  async function saveDomainSettings() {
    setSavingDomain(true);
    setDomainMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "domainSettings", siteBaseUrl }),
      });
      const result = await response.json() as { message?: string; error?: string; siteBaseUrl?: string };
      if (!response.ok) throw new Error(result.error ?? "Failed to save root domain settings.");
      setDomainMessage(result.message ?? "Root domain saved.");
      setSiteBaseUrl(result.siteBaseUrl ?? siteBaseUrl);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to save root domain settings.");
    } finally {
      setSavingDomain(false);
    }
  }

  async function toggleListingVisibility(id: string, visible: boolean) {
    setData((prev) => !prev ? prev : ({
      ...prev,
      properties: prev.properties.map((p) => p.id === id ? { ...p, status: visible ? "published" : "hidden", deleteRequestedAt: visible ? null : p.deleteRequestedAt } : p),
    }));
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

  async function saveContactSettings() {
    setSavingContacts(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "setting",
          key: "contactChannels",
          value: {
            adminContactPhone: adminPhone,
            customerCarePhone: carePhone,
            customerCareEmail: careEmail,
          },
        }),
      });
      const result = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Failed to save contact settings.");
      setMessage(result.message ?? "Contact channels updated successfully.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to save contact settings.");
    } finally {
      setSavingContacts(false);
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

  async function saveHomeTicker() {
    setSavingTicker(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "setting", key: "homeTicker", value: { text: tickerText, propertyId: tickerPropertyId } }) });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "The homepage banner could not be saved.");
      setMessage(result.message ?? "Homepage listing banner saved.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The homepage banner could not be saved.");
    } finally {
      setSavingTicker(false);
    }
  }

  async function savePopupAd(overrideEnabled?: boolean) {
    setSavingPopup(true);
    setError("");
    setMessage("");
    const isEnabled = typeof overrideEnabled === "boolean" ? overrideEnabled : popupEnabled;
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "setting",
          key: "popupAd",
          value: {
            enabled: isEnabled,
            propertyId: popupListingId,
            kicker: popupKicker,
            title: popupTitle,
            date: popupDate,
            body: popupBody,
            image: popupImage,
          },
        }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "The listing popup could not be saved.");
      setMessage(result.message ?? "Listing popup settings saved.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The listing popup could not be saved.");
    } finally {
      setSavingPopup(false);
    }
  }

  async function activatePlotAsPopup(plot: Property) {
    const kicker = popupKicker || "🔥 EXCLUSIVE OPPORTUNITY";
    const title = plot.title;
    const priceFormatted = Number(plot.price) >= 10000000
      ? `₹${(Number(plot.price) / 10000000).toFixed(2)} Cr`
      : Number(plot.price) >= 100000
      ? `₹${(Number(plot.price) / 100000).toFixed(1)} Lakhs`
      : `₹${Number(plot.price).toLocaleString("en-IN")}`;
    const date = "Verified Listing · Limited Period";
    const body = `${[plot.locality, plot.city].filter(Boolean).join(", ")} · ${priceFormatted} · ${plot.area} ${plot.unit}. Clear title documentation verified by NILAY.`;
    const image = plot.image || "";

    setPopupEnabled(true);
    setPopupListingId(plot.id);
    setPopupKicker(kicker);
    setPopupTitle(title);
    setPopupDate(date);
    setPopupBody(body);
    setPopupImage(image);

    setSavingPopup(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "setting",
          key: "popupAd",
          value: {
            enabled: true,
            propertyId: plot.id,
            kicker,
            title,
            date,
            body,
            image,
          },
        }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Failed to activate popup ad.");
      setMessage(`Popup ad enabled! "${plot.title}" will appear to visitors after 5 seconds.`);
      if (typeof window !== "undefined") {
        try { window.sessionStorage.clear(); } catch { /* ignore */ }
      }
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to activate popup ad.");
    } finally {
      setSavingPopup(false);
    }
  }

  async function saveAnnouncementTicker() {
    setSavingAnnouncement(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "setting", key: "announcementTicker", value: { enabled: announcementEnabled, text: announcementText } }) });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "The scrolling announcement could not be saved.");
      setMessage(result.message ?? "Scrolling announcement saved.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The scrolling announcement could not be saved.");
    } finally {
      setSavingAnnouncement(false);
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

  function jumpToAdminListing(prop: Property) {
    setSection("properties");
    if (prop.deleteRequestedAt || prop.status === "pending") {
      setListingTab("pending");
    } else if (prop.status === "hidden") {
      setListingTab("hidden");
    } else {
      setListingTab((prop.listingCategory as "sale" | "rent") ?? "sale");
    }
    setFocusedListingId(prop.id);
    setTimeout(() => {
      scrollToElementAndFocus(`admin-listing-${prop.id}`);
    }, 80);
  }

  async function saveEmailSettings() {
    setSavingEmailSettings(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "setting",
          key: "emailSettings",
          value: {
            resendApiKey,
            emailFrom,
            adminNotificationEmail,
          },
        }),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save email settings.");
      setMessage(data.message ?? "Email settings saved successfully.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save email settings.");
    } finally {
      setSavingEmailSettings(false);
    }
  }

  async function runDailyNurtureAction() {
    setRunningNurture(true);
    setNurtureResult("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run-daily-nurture" }),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to run daily nurture.");
      setNurtureResult(`✅ ${data.message ?? "Daily nurture ran successfully!"}`);
    } catch (err) {
      setNurtureResult(`❌ ${err instanceof Error ? err.message : "Nurture sequence failed."}`);
    } finally {
      setRunningNurture(false);
    }
  }

  async function sendTestEmailAction() {
    setSendingTestEmail(true);
    setTestEmailResult("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-test-email", targetEmail: adminNotificationEmail }),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Test email failed to send.");
      setTestEmailResult(`✅ ${data.message ?? "Test email delivered successfully!"}`);
    } catch (err) {
      setTestEmailResult(`❌ ${err instanceof Error ? err.message : "Test email failed."}`);
    } finally {
      setSendingTestEmail(false);
    }
  }

  async function pushAllQueuedEmailsAction() {
    setPushingAllEmails(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "push-all-queued-emails" }),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to push emails.");
      setMessage(data.message ?? "Queued emails pushed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to push emails.");
    } finally {
      setPushingAllEmails(false);
    }
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    setError("");
    setMessage("");
    const formData = new FormData();
    formData.set("logo", file);
    try {
      const res = await fetch("/api/branding", {
        method: "POST",
        body: formData,
      });
      const data = await res.json() as { logoUrl?: string; message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to upload logo.");
      setSiteLogoUrl(data.logoUrl || "");
      try {
        if (data.logoUrl) localStorage.setItem("nilay:custom-logo", data.logoUrl);
      } catch {}
      window.dispatchEvent(new CustomEvent("nilay:logo-updated", { detail: { logoUrl: data.logoUrl } }));
      setMessage(data.message ?? "Logo updated successfully across all pages!");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleResetLogo() {
    setUploadingLogo(true);
    setError("");
    setMessage("");
    const formData = new FormData();
    formData.set("reset", "true");
    try {
      const res = await fetch("/api/branding", {
        method: "POST",
        body: formData,
      });
      const data = await res.json() as { logoUrl?: string; message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to reset logo.");
      setSiteLogoUrl("");
      try {
        localStorage.removeItem("nilay:custom-logo");
      } catch {}
      window.dispatchEvent(new CustomEvent("nilay:logo-updated", { detail: { logoUrl: "/nilay-logo.png" } }));
      setMessage(data.message ?? "Logo reset to default NILAY brand mark.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset logo.");
    } finally {
      setUploadingLogo(false);
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

  return (
    <section className="admin-content">
      {/* Quick Action Navigation Bar */}
      <div className="admin-quick-nav-bar" aria-label="Admin Navigation Actions">
        <button
          type="button"
          className={`admin-nav-pill ${section === "ads" ? "is-active" : ""}`}
          onClick={() => navigateToSection("ads", { elementId: "admin-section-ads", focusSelector: "#popup-ad-title" })}
        >
          <Megaphone size={15} />
          <span>Ads &amp; Promotion</span>
          <span className={`admin-status-dot ${data.settings.popupAdEnabled ? "is-on" : ""}`} />
        </button>
        <button
          type="button"
          className={`admin-nav-pill ${section === "rolling" ? "is-active" : ""}`}
          onClick={() => navigateToSection("rolling", { elementId: "admin-section-rolling", focusSelector: "#announcement-text-input" })}
        >
          <Sparkles size={15} />
          <span>Rolling Tickers</span>
          <span className={`admin-status-dot ${data.settings.announcementEnabled ? "is-on" : ""}`} />
        </button>
        <button
          type="button"
          className={`admin-nav-pill ${section === "leads" ? "is-active" : ""}`}
          onClick={() => navigateToSection("leads", { elementId: "admin-section-leads" })}
        >
          <Users size={15} />
          <span>Leads CRM</span>
        </button>
        <button
          type="button"
          className={`admin-nav-pill ${section === "properties" ? "is-active" : ""}`}
          onClick={() => navigateToSection("properties", { elementId: "admin-section-properties" })}
        >
          <Home size={15} />
          <span>Plots &amp; Listings ({data.properties.length})</span>
        </button>
        <Link href="/admin/analytics" className="admin-nav-pill">
          <TrendingUp size={15} />
          <span>Visitor Analytics</span>
          <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <AdminDailySummary
        onSelectSection={(s, options) => {
          navigateToSection(s, {
            listingTab: options?.listingTab,
            elementId: options?.leadId ? `admin-lead-${options.leadId}` : `admin-section-${s}`,
          });
        }}
      />

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this record?"
          description="This action cannot be undone. The selected record will be permanently deleted."
          confirmLabel="Delete permanently"
          error={error}
          busy={busyId === pendingDelete.id}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}

      {/* Live Full-Screen Popup Test Modal */}
      {showLivePopupModal && (
        <div className="promotion-popup" role="dialog" aria-modal="true" aria-label="Popup Ad Live Test" style={{ zIndex: 99999 }} onClick={() => setShowLivePopupModal(false)}>
          <div className="promotion-popup-modal-wrap" onClick={(e) => e.stopPropagation()}>
            <article className="promotion-popup-card">
              <button
                type="button"
                className="promotion-popup-card-close"
                aria-label="Close test popup"
                onClick={() => setShowLivePopupModal(false)}
              >
                <X size={18} strokeWidth={2.5} />
              </button>
              <div className="promotion-popup-card-inner">
                <div className="promotion-popup-tabs">
                  <span>{popupKicker || "IMPORTANT ANNOUNCEMENT"}</span>
                  <span>{popupDate || "Verified listing"}</span>
                </div>
                <img
                  className="promotion-popup-image"
                  src={popupImage || (data.properties.find((p) => p.id === popupListingId)?.image) || "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80"}
                  alt="Test popup"
                />
                <div className="promotion-popup-copy">
                  <span className="eyebrow">{popupKicker || "IMPORTANT ANNOUNCEMENT"}</span>
                  {popupDate && <span className="promotion-popup-date">{popupDate}</span>}
                  <h2>{popupTitle || "Featured Property Announcement"}</h2>
                  <p className="promotion-popup-body">{popupBody || "Announcement details will appear here."}</p>
                  <div className="promotion-popup-details">
                    <strong>
                      {(() => {
                        const p = data.properties.find((prop) => prop.id === popupListingId);
                        return p ? (Number(p.price) >= 10000000 ? `₹${(Number(p.price) / 10000000).toFixed(2)} Cr` : `₹${(Number(p.price) / 100000).toFixed(1)} Lakhs`) : "₹ Special Price";
                      })()}
                    </strong>
                    <span>
                      {(() => {
                        const p = data.properties.find((prop) => prop.id === popupListingId);
                        return p ? [p.locality, p.city].filter(Boolean).join(" · ") : "Telangana";
                      })()}
                    </span>
                  </div>
                  <div className="promotion-popup-cta" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.15)", color: "var(--lime)", fontSize: 13, fontWeight: 700 }}>
                    <span>View Listing Details</span>
                    <ArrowUpRight size={16} />
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      )}

      <div id="admin-setting-seller-phones" className="admin-setting-card">
        <div>
          <strong>Site-wide seller contact visibility</strong>
          <p>This overall switch overrides every listing. When it is on, each listing&apos;s phone visibility switch controls whether its number appears. When it is off, seller contact details are hidden across the website and enquiries go to NILAY.</p>
        </div>
        <button
          type="button"
          className={`admin-setting-toggle${data.settings.showSellerPhones ? " is-on" : ""}`}
          aria-pressed={data.settings.showSellerPhones}
          disabled={savingPhoneSetting}
          onClick={() => void toggleSellerPhones()}
        >
          <span aria-hidden="true" />{savingPhoneSetting ? "Saving…" : data.settings.showSellerPhones ? "ON · Direct contact" : "OFF · NILAY connects"}
        </button>
      </div>

      <section id="admin-setting-contacts" className="admin-setting-card admin-contact-channels-card" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <strong style={{ fontSize: 14 }}>Direct Contact, WhatsApp & Support Channels</strong>
            <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: 11 }}>
              Configure the phone numbers and email that receive customer inquiries and represent NILAY across the website.
            </p>
          </div>
          <button
            type="button"
            className="button button-dark"
            style={{ minHeight: 34, fontSize: 11, padding: "6px 16px" }}
            disabled={savingContacts}
            onClick={() => void saveContactSettings()}
          >
            {savingContacts ? "Saving…" : "Save Contact Settings"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          <label className="admin-field" style={{ margin: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
              <span>📱</span> Admin WhatsApp Number (Inquiry Receiver)
            </span>
            <input
              type="text"
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value)}
              placeholder="8074399963"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
                fontSize: 12,
              }}
            />
            <span style={{ fontSize: 10, color: "var(--muted)" }}>
              Receives full plot details when buyers tap &quot;Connect with us&quot; or when seller phones are hidden.
            </span>
          </label>

          <label className="admin-field" style={{ margin: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
              <span>📞</span> Customer Care Number
            </span>
            <input
              type="text"
              value={carePhone}
              onChange={(e) => setCarePhone(e.target.value)}
              placeholder="8074399963"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
                fontSize: 12,
              }}
            />
            <span style={{ fontSize: 10, color: "var(--muted)" }}>
              Public customer care phone shown on website footer and support links.
            </span>
          </label>

          <label className="admin-field" style={{ margin: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
              <span>✉️</span> Customer Care Email
            </span>
            <input
              type="email"
              value={careEmail}
              onChange={(e) => setCareEmail(e.target.value)}
              placeholder="care@nilay.in"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
                fontSize: 12,
              }}
            />
            <span style={{ fontSize: 10, color: "var(--muted)" }}>
              Official contact email displayed in website footer and email notifications.
            </span>
          </label>
        </div>
      </section>

      {/* Website Brand Logo Manager */}
      <section id="admin-setting-branding" className="admin-setting-card" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <strong style={{ fontSize: 14 }}>Website Brand Logo</strong>
            <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: 11 }}>
              Upload a custom logo to replace the brand mark across all pages (header, mobile drawer, footer, admin). The logo strictly adheres to the standard layout dimensions.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="file"
              ref={logoFileInputRef}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleLogoUpload(file);
              }}
            />
            <button
              type="button"
              className="button button-dark"
              style={{ minHeight: 34, fontSize: 11, padding: "6px 14px" }}
              disabled={uploadingLogo}
              onClick={() => logoFileInputRef.current?.click()}
            >
              {uploadingLogo ? "Uploading…" : "📁 Upload New Logo"}
            </button>
            {siteLogoUrl && (
              <button
                type="button"
                className="button button-outline"
                style={{ minHeight: 34, fontSize: 11, padding: "6px 12px" }}
                disabled={uploadingLogo}
                onClick={() => void handleResetLogo()}
              >
                Reset Default
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "12px 16px", borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ textAlign: "center" }}>
            <span style={{ display: "block", fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>Current Logo Preview:</span>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "8px 14px", background: "rgba(255,255,255,.06)", borderRadius: 6, border: "1px solid rgba(255,255,255,.1)" }}>
              <BrandLogo />
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
            <strong style={{ color: "var(--ink)", display: "block", marginBottom: 2 }}>
              {siteLogoUrl ? "Using custom uploaded logo" : "Using standard NILAY brand mark (/nilay-logo.png)"}
            </strong>
            <span>Standard dimensions: 90×60px in header and mobile navigation, 150×100px in footer. Maintains original proportions without stretching.</span>
          </div>
        </div>
      </section>

      {/* Email Delivery & Resend Settings */}
      <section id="admin-setting-email" className="admin-setting-card" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <strong style={{ fontSize: 14 }}>Email Notifications &amp; Resend Delivery Settings</strong>
            <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: 11 }}>
              Configure Resend API to deliver new user registration alerts and buyer inquiry notifications to admin and confirmation emails to members.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="button button-dark"
              style={{ minHeight: 34, fontSize: 11, padding: "6px 14px" }}
              disabled={savingEmailSettings}
              onClick={() => void saveEmailSettings()}
            >
              {savingEmailSettings ? "Saving…" : "Save Email Settings"}
            </button>
            <button
              type="button"
              className="button button-outline"
              style={{ minHeight: 34, fontSize: 11, padding: "6px 12px" }}
              disabled={pushingAllEmails}
              onClick={() => void pushAllQueuedEmailsAction()}
              title="Push all pending registration and inquiry emails"
            >
              {pushingAllEmails ? "Pushing…" : "🚀 Push All Queued Emails"}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          <label className="admin-field" style={{ margin: 0 }}>
            <span>Resend API Key</span>
            <input
              type="password"
              value={resendApiKey}
              onChange={(e) => setResendApiKey(e.target.value)}
              placeholder="re_xxxxxxxxxxxxxx"
            />
            <small style={{ color: "var(--muted)", fontSize: 10 }}>From resend.com/api-keys</small>
          </label>
          <label className="admin-field" style={{ margin: 0 }}>
            <span>From Sender Email</span>
            <input
              type="text"
              value={emailFrom}
              onChange={(e) => setEmailFrom(e.target.value)}
              placeholder="NILAY <onboarding@resend.dev>"
            />
            <small style={{ color: "var(--muted)", fontSize: 10 }}>Use onboarding@resend.dev or your verified domain</small>
          </label>
          <label className="admin-field" style={{ margin: 0 }}>
            <span>Admin Recipient Email</span>
            <input
              type="email"
              value={adminNotificationEmail}
              onChange={(e) => setAdminNotificationEmail(e.target.value)}
              placeholder="pavansai580@gmail.com"
            />
            <small style={{ color: "var(--muted)", fontSize: 10 }}>Receives leads, registrations &amp; inquiry alerts</small>
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <button
            type="button"
            className="button button-outline"
            style={{ minHeight: 32, fontSize: 11, padding: "4px 12px" }}
            disabled={sendingTestEmail}
            onClick={() => void sendTestEmailAction()}
          >
            {sendingTestEmail ? "Sending Test Email…" : "✉️ Send Test Email to Admin"}
          </button>
          <button
            type="button"
            className="button button-outline"
            style={{ minHeight: 32, fontSize: 11, padding: "4px 12px", borderColor: "rgba(198, 220, 129, 0.4)" }}
            disabled={runningNurture}
            onClick={() => void runDailyNurtureAction()}
            title="Send daily email updates to all active customers who looked at listings"
          >
            {runningNurture ? "Running Daily Nurture…" : "🔄 Run Daily Customer Listing Nurture"}
          </button>
          {testEmailResult && (
            <span style={{ fontSize: 11, color: testEmailResult.startsWith("✅") ? "var(--lime)" : "#ff6b6b" }}>
              {testEmailResult}
            </span>
          )}
          {nurtureResult && (
            <span style={{ fontSize: 11, color: nurtureResult.startsWith("✅") ? "var(--lime)" : "#ff6b6b" }}>
              {nurtureResult}
            </span>
          )}
        </div>
      </section>

      {/* Website Root Domain & Base URL Configuration */}
      <section className="admin-backup-card" style={{ background: "linear-gradient(135deg, #132219 0%, #0d1611 100%)", borderColor: "rgba(74, 222, 128, 0.25)" }}>
        <div className="admin-backup-copy" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <span className="eyebrow" style={{ color: "var(--lime)" }}>ROOT DOMAIN &amp; URL ROUTING</span>
            <h2>Website Root Domain &amp; Base URL</h2>
            <p>
              Controls the base address used in all emails, WhatsApp listing links, and social shares.
            </p>
          </div>
          <button
            type="button"
            className="button button-dark"
            style={{ minHeight: 34, fontSize: 11, padding: "6px 16px" }}
            disabled={savingDomain}
            onClick={() => void saveDomainSettings()}
          >
            {savingDomain ? "Saving…" : "Save Root Domain"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginTop: 12 }}>
          <div style={{ padding: 12, background: "rgba(0,0,0,0.25)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>
              Currently Pointed Active Domain
            </span>
            <strong style={{ fontSize: 14, color: "#4ade80", fontFamily: "var(--mono, monospace)" }}>
              {currentOrigin || (typeof window !== "undefined" ? window.location.origin : "https://nkart.store")}
            </strong>
            <small style={{ display: "block", color: "var(--muted)", fontSize: 10, marginTop: 4 }}>
              Live host detected from current browser session.
            </small>
          </div>

          <label className="admin-field" style={{ margin: 0 }}>
            <span>Configured Root Domain (Base URL)</span>
            <input
              type="url"
              value={siteBaseUrl}
              onChange={(e) => setSiteBaseUrl(e.target.value)}
              placeholder={currentOrigin || "https://nkart.store"}
            />
            <small style={{ color: "var(--muted)", fontSize: 10 }}>
              Leave blank to automatically use the pointed domain or Render URL.
            </small>
          </label>
        </div>

        {domainMessage && (
          <p style={{ marginTop: 10, fontSize: 11, color: "var(--lime)" }}>
            ✅ {domainMessage}
          </p>
        )}
      </section>

      <section id="admin-setting-backup" className="admin-backup-card" aria-labelledby="admin-backup-title">
        {backupError && <div className="admin-backup-feedback is-error" role="alert">{backupError}</div>}
        {backupMessage && <div className="admin-backup-feedback" role="status">{backupMessage}</div>}
        <div className="admin-backup-copy">
          <span className="eyebrow">DATA PROTECTION</span>
          <h2 id="admin-backup-title">Site backup</h2>
          <p>Stream a portable copy of all site data and listing photos/videos to your device. Upload the completed .gz file to restore it.</p>
        </div>
        <div className="admin-backup-actions">
          <input
            ref={backupInputRef}
            className="admin-backup-file"
            type="file"
            accept=".gz,.json,.nilay-backup,.terraland-backup,application/gzip,application/json"
            aria-label="Choose a NILAY backup file"
            disabled={backupBusy}
            onChange={(event) => void uploadBackup(event.currentTarget.files?.[0])}
          />
          <button className="admin-backup-button admin-backup-upload" type="button" disabled={backupBusy} onClick={() => backupInputRef.current?.click()}>
            <Upload size={16} aria-hidden="true" />{backupBusy ? "Working…" : "Upload backup"}
          </button>
          <button className="admin-backup-button admin-backup-download" type="button" disabled={backupBusy} onClick={() => void downloadBackup()}>
            <Download size={16} aria-hidden="true" />Download backup
          </button>
        </div>
      </section>

      {data.registrationNotifications.some((notice) => notice.status === "pending") && (
        <div className="admin-email-alert">
          <div>
            <strong>Registration emails are queued</strong>
            <p>New accounts can sign in. Configure a Resend API key and verified sender to deliver notices to pavansai580@gmail.com.</p>
          </div>
          <button className="button button-dark" type="button" disabled={retryingEmail} onClick={() => void retryRegistrationEmails()}>{retryingEmail ? "Retrying…" : "Retry queued emails"}</button>
        </div>
      )}

      {data.inquiryNotifications.some((notice) => notice.status === "pending") && (
        <div className="admin-email-alert">
          <div>
            <strong>Enquiry emails are queued</strong>
            <p>Configure the Resend sender and API key to deliver saved buyer enquiries to pavansai580@gmail.com.</p>
          </div>
          <button className="button button-dark" type="button" disabled={retryingInquiryEmail} onClick={() => void retryInquiryEmails()}>{retryingInquiryEmail ? "Retrying…" : "Retry enquiry emails"}</button>
        </div>
      )}

      {data.properties.some((property) => property.deleteRequestedAt) && (
        <div className="admin-email-alert">
          <div>
            <strong>{data.properties.filter((property) => property.deleteRequestedAt).length} listing deletion request(s) need your approval</strong>
            <p>Requested listings stay online until you approve deletion from the listings panel.</p>
          </div>
          <button className="button button-dark" type="button" onClick={reviewPendingListings}>Review listings</button>
        </div>
      )}

      <Link className="admin-analytics-link" href="/admin/analytics">
        <span>
          <span className="eyebrow">VISITOR ANALYTICS</span>
          <strong>Daily and monthly visitor graphs</strong>
          <small>View clear traffic summaries and manage recorded analytics.</small>
        </span>
        <span aria-hidden="true">↗</span>
      </Link>

      {/* Main Section Navigation Bar */}
      <div className="admin-stats">
        <button className={section === "ads" ? "is-active" : ""} onClick={() => navigateToSection("ads", { elementId: "admin-section-ads", focusSelector: "#popup-ad-title" })}>
          <span>ADS &amp; PROMO</span>
          <strong>{data.settings.popupAdEnabled ? "ACTIVE" : "PAUSED"}</strong>
        </button>
        <button className={section === "rolling" ? "is-active" : ""} onClick={() => navigateToSection("rolling", { elementId: "admin-section-rolling", focusSelector: "#announcement-text-input" })}>
          <span>ROLLING TICKERS</span>
          <strong>{data.settings.announcementEnabled ? "ROLLING" : "OFF"}</strong>
        </button>
        <button className={section === "leads" ? "is-active" : ""} onClick={() => navigateToSection("leads", { elementId: "admin-section-leads" })}>
          <span>LEADS CRM</span>
          <strong>CRM</strong>
        </button>
        <button className={section === "requirements" ? "is-active" : ""} onClick={() => navigateToSection("requirements", { elementId: "admin-section-requirements" })}>
          <span>BUYER REQS</span>
          <strong>REQS</strong>
        </button>
        <button className={section === "visits" ? "is-active" : ""} onClick={() => navigateToSection("visits", { elementId: "admin-section-visits" })}>
          <span>SITE VISITS</span>
          <strong>VISITS</strong>
        </button>
        <button className={section === "matches" ? "is-active" : ""} onClick={() => navigateToSection("matches", { elementId: "admin-section-matches" })}>
          <span>MATCHMAKER</span>
          <strong>MATCH</strong>
        </button>
        <button className={section === "packages" ? "is-active" : ""} onClick={() => navigateToSection("packages", { elementId: "admin-section-packages" })}>
          <span>PACKAGES</span>
          <strong>FEES</strong>
        </button>
        <button className={section === "properties" ? "is-active" : ""} onClick={() => navigateToSection("properties", { elementId: "admin-section-properties" })}>
          <span>LISTINGS</span>
          <strong>{data.properties.length}</strong>
        </button>
        <button className={section === "users" ? "is-active" : ""} onClick={() => navigateToSection("users", { elementId: "admin-section-users" })}>
          <span>MEMBERS</span>
          <strong>{data.users.filter((user) => user.email !== "pavansai580@gmail.com").length}</strong>
        </button>
        <button className={section === "inquiries" ? "is-active" : ""} onClick={() => navigateToSection("inquiries", { elementId: "admin-section-inquiries" })}>
          <span>ENQUIRIES</span>
          <strong>{data.inquiries.length}</strong>
        </button>
        <button className={section === "reviews" ? "is-active" : ""} onClick={() => navigateToSection("reviews", { elementId: "admin-section-reviews" })}>
          <span>REVIEWS</span>
          <strong>{data.reviews.length}</strong>
        </button>
        <button className={section === "phoneClicks" ? "is-active" : ""} onClick={() => navigateToSection("phoneClicks", { elementId: "admin-section-phoneClicks" })}>
          <span>PHONE &amp; WHATSAPP</span>
          <strong>{data.phoneClicks.length}</strong>
        </button>
        <button className={section === "activity" ? "is-active" : ""} onClick={() => navigateToSection("activity", { elementId: "admin-section-activity" })}>
          <span>ALL ACTIVITY</span>
          <strong>{data.siteActivity.length}</strong>
        </button>
      </div>

      {error && !pendingDelete && <div className="form-error" role="alert">{error}</div>}
      {message && <div className="admin-success" role="status">{message}</div>}

      {loading ? (
        <p className="admin-empty">Loading site records…</p>
      ) : (
        <>
          {section === "leads" && <div id="admin-section-leads"><AdminLeadsCrm /></div>}
          {section === "requirements" && <div id="admin-section-requirements"><AdminRequirementsView /></div>}
          {section === "visits" && <div id="admin-section-visits"><AdminSiteVisitsView /></div>}
          {section === "matches" && <div id="admin-section-matches"><AdminMatchesView /></div>}
          {section === "packages" && <div id="admin-section-packages"><AdminPackagesView /></div>}

          {/* ADS & PROMOTION CONTROL CENTER */}
          {section === "ads" && (
            <div id="admin-section-ads" className="admin-promotion-controls">
              {/* 5-Second Modal Popup Ad */}
              <section id="admin-popup-ad-section" className="admin-ad-manager" aria-labelledby="admin-ad-manager-title">
                <div className="admin-section-header">
                  <span className="eyebrow">SITE PROMOTION</span>
                  <h2 id="admin-ad-manager-title">5-Second Modal Popup Ad</h2>
                  <p>
                    Visitors see this interactive announcement card on the homepage 5 seconds after loading. Tapping the popup opens the listing details directly. It appears on the homepage on every refresh.
                  </p>
                </div>

                <div className="admin-card-inner">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                    <label className="admin-ad-toggle" style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={popupEnabled}
                        onChange={(event) => {
                          const next = event.target.checked;
                          setPopupEnabled(next);
                          void savePopupAd(next);
                        }}
                      />
                      <strong>Enable the 5-second listing popup</strong>
                    </label>
                    <button
                      type="button"
                      className="button button-dark"
                      style={{ minHeight: 34, fontSize: 11, padding: "6px 16px" }}
                      disabled={savingPopup}
                      onClick={() => void savePopupAd(true)}
                    >
                      {savingPopup ? "Saving…" : "🚀 Save & Activate Popup Now"}
                    </button>
                  </div>

                  <div className="admin-field-group">
                    <label>
                      Published plot to feature
                      <select
                        value={popupListingId}
                        onChange={(event) => {
                          handleSelectPopupPlot(event.target.value);
                          scrollToElementAndFocus("admin-popup-ad-section", "#popup-ad-title");
                        }}
                      >
                        <option value="">Select a published plot</option>
                        {data.properties
                          .filter((property) => property.status === "published")
                          .map((property) => (
                            <option key={property.id} value={property.id}>
                              {property.title} · {property.locality} (₹{Number(property.price).toLocaleString("en-IN")})
                            </option>
                          ))}
                      </select>
                    </label>
                    {popupListingId && (
                      <button
                        type="button"
                        className="admin-helper-btn"
                        onClick={() => {
                          autoFillPopupFromPlot(popupListingId);
                          scrollToElementAndFocus("admin-popup-ad-section", "#popup-ad-title");
                        }}
                      >
                        ⚡ Auto-fill heading &amp; details from this plot
                      </button>
                    )}
                  </div>

                  <div className="admin-field-group">
                    <label>
                      Top Badge / Kicker Label
                      <input
                        id="popup-ad-kicker"
                        value={popupKicker}
                        onChange={(event) => setPopupKicker(event.target.value)}
                        maxLength={80}
                        placeholder="🔥 EXCLUSIVE OPPORTUNITY"
                      />
                    </label>
                    <div className="admin-preset-row">
                      <span className="admin-preset-label">Quick presets:</span>
                      {["🔥 HOT DEAL", "⚡ SPOTLIGHT PLOT", "HMDA APPROVED", "PRICE DROP", "EXCLUSIVE LAUNCH", "PRIME LOCATION"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className="admin-preset-btn"
                          onClick={() => {
                            setPopupKicker(preset);
                            scrollToElementAndFocus("admin-popup-ad-section", "#popup-ad-kicker");
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label>
                    Announcement heading
                    <input
                      id="popup-ad-title"
                      value={popupTitle}
                      onChange={(event) => setPopupTitle(event.target.value)}
                      maxLength={140}
                      placeholder="Defaults to the selected plot title"
                    />
                  </label>

                  <label>
                    Date, Subtitle or Urgency note
                    <input
                      id="popup-ad-date"
                      value={popupDate}
                      onChange={(event) => setPopupDate(event.target.value)}
                      maxLength={80}
                      placeholder="e.g. Valid till Sunday · Spot Booking Available"
                    />
                  </label>

                  <label>
                    Custom popup image URL (optional)
                    <input
                      id="popup-ad-image"
                      value={popupImage}
                      onChange={(event) => setPopupImage(event.target.value)}
                      maxLength={1000}
                      placeholder="Leave blank to use the selected plot photo"
                    />
                  </label>

                  <label>
                    Announcement details / pitch
                    <textarea
                      id="popup-ad-body"
                      value={popupBody}
                      onChange={(event) => setPopupBody(event.target.value)}
                      maxLength={700}
                      rows={4}
                      placeholder="Write the announcement visitors should see."
                    />
                  </label>

                  {/* Live Visual Card Preview */}
                  <div className="admin-preview-container">
                    <div className="admin-preview-top">
                      <span className="eyebrow">LIVE INTERACTIVE PREVIEW</span>
                      <button
                        type="button"
                        className="admin-test-preview-btn"
                        onClick={() => setShowLivePopupModal(true)}
                      >
                        <Eye size={14} /> Test Full-Screen Modal
                      </button>
                    </div>
                    <div className="admin-live-ad-card">
                      <div className="admin-live-ad-image-wrap">
                        <img
                          src={popupImage || (data.properties.find((p) => p.id === popupListingId)?.image) || "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80"}
                          alt="Ad Preview"
                        />
                        <span className="admin-live-ad-kicker">{popupKicker || "ANNOUNCEMENT"}</span>
                      </div>
                      <div className="admin-live-ad-body">
                        <div className="admin-live-ad-title-row">
                          <h4>{popupTitle || "Featured Property Title"}</h4>
                          {popupDate && <span className="admin-live-ad-date">{popupDate}</span>}
                        </div>
                        <p>{popupBody || "Promotional description and highlights will display here."}</p>
                        <div className="admin-live-ad-footer">
                          <span className="admin-live-ad-price">
                            {(() => {
                              const p = data.properties.find((prop) => prop.id === popupListingId);
                              return p ? (Number(p.price) >= 10000000 ? `₹${(Number(p.price) / 10000000).toFixed(2)} Cr` : `₹${(Number(p.price) / 100000).toFixed(1)} Lakhs`) : "₹ Special Price";
                            })()}
                          </span>
                          <span className="admin-live-ad-cta">View Listing ↗</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="admin-action-row">
                    <button
                      className="button button-dark"
                      type="button"
                      disabled={savingPopup}
                      onClick={() => void savePopupAd()}
                    >
                      {savingPopup ? "Saving…" : "Save Ads & Popup Settings"}
                    </button>
                  </div>

                  {/* Instant 1-Click Popup Chooser from Listed Properties */}
                  <div className="admin-ad-quick-picker" style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                    <div style={{ marginBottom: 12 }}>
                      <span className="eyebrow">ONE-CLICK PROMOTION</span>
                      <h3 style={{ margin: "4px 0", color: "var(--ink)", fontSize: 16 }}>Choose Any Listed Plot to Launch as Popup</h3>
                      <p style={{ margin: 0, color: "var(--muted)", fontSize: 11 }}>Tap any listing below to immediately set it as the live 5-second popup ad on the website.</p>
                    </div>
                    <div className="admin-ad-listing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                      {data.properties.filter((p) => p.status === "published").map((plot) => (
                        <div
                          key={plot.id}
                          style={{
                            padding: 12,
                            borderRadius: 10,
                            background: popupListingId === plot.id && popupEnabled ? "rgba(198, 220, 129, 0.12)" : "rgba(255, 255, 255, 0.03)",
                            border: popupListingId === plot.id && popupEnabled ? "1px solid var(--lime)" : "1px solid rgba(255, 255, 255, 0.08)",
                            display: "grid",
                            gap: 6
                          }}
                        >
                          {plot.image && <img src={plot.image} alt={plot.title} style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 6 }} />}
                          <strong style={{ fontSize: 12, color: "var(--ink)" }}>{plot.title}</strong>
                          <span style={{ fontSize: 10.5, color: "var(--lime)" }}>₹{Number(plot.price).toLocaleString("en-IN")} · {plot.locality}</span>
                          <button
                            type="button"
                            className="button button-dark"
                            style={{ minHeight: 32, fontSize: 11, padding: "5px 10px", marginTop: 4 }}
                            disabled={savingPopup}
                            onClick={() => {
                              void activatePlotAsPopup(plot);
                              scrollToElementAndFocus("admin-popup-ad-section", "#popup-ad-title");
                            }}
                          >
                            {popupListingId === plot.id && popupEnabled ? "✓ Active Popup" : "🚀 Set as 5-Sec Popup"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* WhatsApp & Social Media Ad Campaign Generator */}
              <section className="admin-ad-manager" aria-labelledby="admin-whatsapp-title">
                <div className="admin-section-header">
                  <span className="eyebrow">BROADCAST MARKETING</span>
                  <h2 id="admin-whatsapp-title">WhatsApp &amp; Social Media Campaign Generator</h2>
                  <p>
                    Instantly generate high-converting promotional ad copy for any plot. Ready to copy or send directly to WhatsApp buyer groups and statuses.
                  </p>
                </div>

                <div className="admin-card-inner">
                  <label>
                    Select listing to promote
                    <select
                      value={selectedPromoPlotId || (selectedPromoPlot?.id ?? "")}
                      onChange={(event) => setSelectedPromoPlotId(event.target.value)}
                    >
                      {data.properties
                        .filter((p) => p.status === "published")
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} · {p.locality} (₹{Number(p.price).toLocaleString("en-IN")})
                          </option>
                        ))}
                    </select>
                  </label>

                  {selectedPromoPlot && (
                    <div className="admin-whatsapp-box">
                      <div className="admin-whatsapp-header">
                        <span>Generated Campaign Message</span>
                        <div className="admin-whatsapp-actions">
                          <button
                            type="button"
                            className="admin-btn-secondary"
                            onClick={() => void copyWhatsAppAd()}
                          >
                            {copiedPromo ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                            {copiedPromo ? "Copied!" : "Copy Ad Text"}
                          </button>
                          <button
                            type="button"
                            className="admin-btn-whatsapp"
                            onClick={shareWhatsAppAd}
                          >
                            <Share2 size={14} /> Open in WhatsApp
                          </button>
                        </div>
                      </div>
                      <pre className="admin-whatsapp-preview">
                        {generateWhatsAppText(selectedPromoPlot)}
                      </pre>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ROLLING ANNOUNCEMENTS & TICKERS CONTROL CENTER */}
          {section === "rolling" && (
            <div id="admin-section-rolling" className="admin-promotion-controls">
              {/* Sitewide Scrolling Top Marquee Ticker */}
              <section id="admin-announcement-section" className="admin-ad-manager" aria-labelledby="admin-announcement-title">
                <div className="admin-section-header">
                  <span className="eyebrow">GLOBAL HEADER MARQUEE</span>
                  <h2 id="admin-announcement-title">Sitewide Scrolling Announcement</h2>
                  <p>
                    Runs a dynamic, high-visibility marquee ticker across all public pages (Home, Search, Farmhouse, Services). Perfect for spot discounts, regulatory updates, or festive announcements.
                  </p>
                </div>

                <div className="admin-card-inner">
                  <label className="admin-ad-toggle">
                    <input
                      type="checkbox"
                      checked={announcementEnabled}
                      onChange={(event) => setAnnouncementEnabled(event.target.checked)}
                    />
                    <strong>Show scrolling announcement ticker across the website</strong>
                  </label>

                  <div className="admin-field-group">
                    <label>
                      Announcement message ({announcementText.length}/240 chars)
                      <input
                        id="announcement-text-input"
                        value={announcementText}
                        onChange={(event) => setAnnouncementText(event.target.value)}
                        maxLength={240}
                        placeholder="⚡ Spot booking discounts available this week! Arrange your site visit today."
                      />
                    </label>
                    <div className="admin-preset-row">
                      <span className="admin-preset-label">1-Click marketing presets:</span>
                      {[
                        "⚡ Spot booking discounts available this week! Arrange your site visit today.",
                        "🔥 Verified HMDA & RERA approved residential plots in Miyapur & Bachupally corridors now live.",
                        "📢 Looking for customized plot sizes? Register your buyer requirements for offline private inventory.",
                        "✨ 0% Brokerage on direct verified owner plots across Hyderabad & Telangana.",
                      ].map((preset, i) => (
                        <button
                          key={i}
                          type="button"
                          className="admin-preset-btn"
                          onClick={() => {
                            setAnnouncementText(preset);
                            scrollToElementAndFocus("admin-announcement-section", "#announcement-text-input");
                          }}
                        >
                          Preset {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Animated Marquee Preview */}
                  <div className="admin-preview-container">
                    <span className="eyebrow">LIVE MARQUEE PREVIEW</span>
                    <div className="site-announcement-ticker" style={{ borderRadius: 10, marginTop: 8 }}>
                      <span className="site-announcement-label">
                        <span aria-hidden="true">⚡</span> LATEST UPDATES
                      </span>
                      <div className="site-announcement-window">
                        <div className="site-announcement-track">
                          <span>{announcementText || "Enter your announcement message above to see it roll live across the website..."}</span>
                          <span aria-hidden="true">{announcementText || "Enter your announcement message above to see it roll live across the website..."}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="admin-action-row">
                    <button
                      className="button button-dark"
                      type="button"
                      disabled={savingAnnouncement}
                      onClick={() => void saveAnnouncementTicker()}
                    >
                      {savingAnnouncement ? "Saving…" : "Save Scrolling Announcement"}
                    </button>
                  </div>
                </div>
              </section>

              {/* Homepage Hero Rolling Listing Banner */}
              <section id="admin-home-ticker-section" className="admin-ad-manager" aria-labelledby="admin-home-ticker-title">
                <div className="admin-section-header">
                  <span className="eyebrow">HOMEPAGE HERO FEATURE</span>
                  <h2 id="admin-home-ticker-title">Homepage Rolling Listing Banner</h2>
                  <p>
                    Customizes the luxury rolling card located beneath the hero search on the homepage. Highlights a featured plot with an interactive rolling ticker and direct link.
                  </p>
                </div>

                <div className="admin-card-inner">
                  <label>
                    Rolling ticker message ({tickerText.length}/180 chars)
                    <input
                      id="home-ticker-text-input"
                      value={tickerText}
                      maxLength={180}
                      onChange={(event) => setTickerText(event.target.value)}
                      placeholder="New verified plots are added after owner and site checks."
                    />
                  </label>

                  <label>
                    Plot image &amp; link to feature
                    <select
                      value={tickerPropertyId}
                      onChange={(event) => setTickerPropertyId(event.target.value)}
                    >
                      <option value="">Newest published sale listing (Automatic)</option>
                      {data.properties
                        .filter((property) => property.status === "published" && property.listingCategory === "sale")
                        .map((property) => (
                          <option key={property.id} value={property.id}>
                            {property.title} · {property.locality}
                          </option>
                        ))}
                    </select>
                  </label>

                  {(() => {
                    const featured = data.properties.find((p) => p.id === tickerPropertyId) ?? data.properties.filter((p) => p.status === "published" && p.listingCategory === "sale").sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0];
                    return featured?.image ? (
                      <div className="admin-home-ticker-preview" style={{ padding: "12px", background: "rgba(255,255,255,.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)" }}>
                        <img src={featured.image} alt={featured.title} style={{ width: 110, height: 75, borderRadius: 8, objectFit: "cover" }} />
                        <div style={{ display: "grid", gap: 4 }}>
                          <span className="eyebrow">FEATURED PREVIEW</span>
                          <strong style={{ color: "var(--ink)", fontSize: 13 }}>{featured.title}</strong>
                          <span style={{ color: "var(--lime)", fontSize: 11 }}>₹{Number(featured.price).toLocaleString("en-IN")} · {featured.locality}, {featured.city}</span>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  <div className="admin-action-row">
                    <button
                      className="button button-dark"
                      type="button"
                      disabled={savingTicker}
                      onClick={() => void saveHomeTicker()}
                    >
                      {savingTicker ? "Saving…" : "Save Homepage Banner"}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {section === "properties" && (
            <div id="admin-section-properties">
              <div className="listing-admin-tabs">
                <div className="listing-admin-segment" role="tablist" aria-label="Listing type">
                  {([["sale", "For sale"], ["rent", "For rent"]] as const).map(([tab, label]) => {
                    const count = data.properties.filter((property) => property.status === "published" && (property.listingCategory ?? "sale") === tab).length;
                    return (
                      <button
                        key={tab}
                        type="button"
                        role="tab"
                        aria-selected={listingTab === tab}
                        className={listingTab === tab ? "is-active" : ""}
                        onClick={() => {
                          setListingTab(tab);
                          scrollToElementAndFocus("admin-properties-list");
                        }}
                      >
                        {label} <span>{count}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className={listingTab === "hidden" ? "hidden-is-active" : ""}
                  aria-pressed={listingTab === "hidden"}
                  onClick={() => {
                    setListingTab("hidden");
                    scrollToElementAndFocus("admin-properties-list");
                  }}
                >
                  Hidden listings <span>{data.properties.filter((property) => property.status === "hidden").length}</span>
                </button>
                <button
                  type="button"
                  className={listingTab === "pending" ? "pending-is-active" : ""}
                  aria-pressed={listingTab === "pending"}
                  onClick={() => {
                    setListingTab("pending");
                    scrollToElementAndFocus("admin-properties-list");
                  }}
                >
                  Pending review <span>{data.properties.filter((property) => property.status === "pending" || property.deleteRequestedAt).length}</span>
                </button>
              </div>

              <div id="admin-properties-list" className="admin-record-list" ref={listingsRef}>
                {data.properties
                  .filter((property) =>
                    listingTab === "hidden"
                      ? property.status === "hidden"
                      : listingTab === "pending"
                      ? property.status === "pending" || Boolean(property.deleteRequestedAt)
                      : property.status === "published" && (property.listingCategory ?? "sale") === listingTab
                  )
                  .map((property) => (
                    <details
                      id={`admin-listing-${property.id}`}
                      className="admin-listing-details"
                      key={property.id}
                      open={focusedListingId === property.id || Boolean((property.deleteRequestedAt || property.status === "pending") && listingTab === "pending")}
                    >
                      <summary className="admin-listing-summary">
                        <div className="admin-summary-main">
                          <span className="eyebrow">
                            {property.deleteRequestedAt ? "DELETION REQUEST AWAITING APPROVAL" : property.status === "pending" ? "NEW LISTING · PENDING REVIEW" : property.status === "hidden" ? "HIDDEN LISTING" : property.listingCategory === "rent" ? "FOR RENT" : "FOR SALE"} · {property.type}
                          </span>
                          <strong>{property.title}</strong>
                          <span className="admin-listing-meta">
                            {property.city} · {property.locality} · ₹{Number(property.price).toLocaleString("en-IN")} · {property.area} {property.unit}
                          </span>
                          <span className="admin-listing-meta">Submitted {property.createdAt ? formatAdminDate(property.createdAt) : "time unavailable"}</span>
                        </div>
                        <div className="admin-listing-actions-group">
                          {property.status === "pending" && (
                            <button
                              type="button"
                              className="button button-dark"
                              style={{ background: "#059669", color: "#fff", borderColor: "#059669", fontWeight: 700, padding: "4px 12px", minHeight: 28, fontSize: 11 }}
                              disabled={busyId === property.id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void approveListing(property.id);
                              }}
                            >
                              ✅ Approve
                            </button>
                          )}
                          <button
                            type="button"
                            className="admin-edit-listing-btn"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openAndFocusListing(property.id);
                            }}
                          >
                            ✏️ Edit
                          </button>
                          {property.status === "published" && (
                            <Link
                              className="admin-listing-page-arrow"
                              href={`/properties/${encodeURIComponent(property.id)}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open ${property.title} listing page`}
                              title="Open listing page"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ArrowUpRight size={16} aria-hidden="true" />
                            </Link>
                          )}
                          <span className="admin-listing-open">Open details</span>
                        </div>
                      </summary>
                      <form
                        className="admin-record"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const form = new FormData(event.currentTarget);
                          void update("property", property.id, {
                            title: form.get("title"),
                            type: form.get("type"),
                            city: form.get("city"),
                            locality: form.get("locality"),
                            owner: form.get("owner"),
                            phone: form.get("phone"),
                            price: form.get("price"),
                            area: form.get("area"),
                            unit: form.get("unit"),
                            badge: form.get("badge"),
                            description: form.get("description"),
                            listingCategory: form.get("listingCategory"),
                            pricePeriod: form.get("pricePeriod"),
                            availability: form.get("availability"),
                            guestCapacity: form.get("guestCapacity"),
                            verified: form.get("verified") === "on",
                            status: (form.get("status") as string) || (property.status === "pending" ? "published" : property.status ?? "published"),
                            images: readMediaArray(form.get("images")),
                            videos: readMediaArray(form.get("videos")),
                            facing: form.get("facing"),
                            approvals: form.get("approvals"),
                            loanAvailable: form.get("loanAvailable"),
                            registrationAvailable: form.get("registrationAvailable"),
                            renovation: form.get("renovation"),
                            cornerPlot: form.get("cornerPlot"),
                            roadWidth: form.get("roadWidth"),
                            surveyNumber: form.get("surveyNumber"),
                            soilType: form.get("soilType"),
                            clearTitle: form.get("clearTitle"),
                            amenities: String(form.get("amenities") ?? "")
                              .split(/\r?\n|,/)
                              .map((amenity) => amenity.trim())
                              .filter(Boolean),
                            address: form.get("address"),
                            landmark: form.get("landmark"),
                            mapUrl: form.get("mapUrl"),
                          });
                        }}
                      >
                        <div className="admin-record-top">
                          <div>
                            <span className="eyebrow">
                              {property.deleteRequestedAt ? "DELETION REQUEST · AWAITING YOUR APPROVAL · " : "LISTING · "}
                              {property.listingCategory === "rent" ? "FOR RENT" : "FOR SALE"} · {property.type} · {property.id.slice(0, 8)}
                            </span>
                            <strong translate="no">{property.title}</strong>
                          </div>
                          <div className="admin-record-actions">
                            {property.status === "pending" && (
                              <button
                                type="button"
                                className="button button-dark"
                                style={{ background: "#059669", color: "#fff", borderColor: "#059669", fontWeight: 700, padding: "6px 14px", minHeight: 32, fontSize: 11 }}
                                disabled={busyId === property.id}
                                onClick={() => void approveListing(property.id)}
                              >
                                ✅ Approve &amp; Publish
                              </button>
                            )}
                            {property.deleteRequestedAt && (
                              <button type="button" className="text-link" disabled={busyId === property.id} onClick={() => void keepListing(property.id)}>
                                Keep listing
                              </button>
                            )}
                            <button type="button" className="admin-delete" disabled={busyId === property.id} onClick={() => void remove("property", property.id)}>
                              {property.deleteRequestedAt ? "Approve & delete" : "Delete listing"}
                            </button>
                          </div>
                        </div>
                        {property.sellerAuthority && (
                          <p className="admin-listing-meta">
                            Seller: {property.sellerAuthority === "owner" ? "Owner" : "Authorised representative"} · Publish permission {property.publicationConsentAt ? `recorded ${formatAdminDate(property.publicationConsentAt)}` : "not recorded"} · Contact permission {property.contactConsentAt ? `recorded ${formatAdminDate(property.contactConsentAt)}` : "not recorded"}
                          </p>
                        )}
                        <div className="admin-form-grid">
                          <label>Title<input name="title" required defaultValue={property.title} /></label>
                          <ListingClassificationFields
                            category={property.listingCategory ?? "sale"}
                            type={property.type}
                            pricePeriod={property.pricePeriod ?? "total"}
                            categoryFields={(category) =>
                              category === "rent" ? (
                                <>
                                  <label className="admin-wide">Availability / rental terms<input name="availability" maxLength={240} defaultValue={property.availability ?? ""} /></label>
                                  <label>Guest capacity<input name="guestCapacity" type="number" min="1" max="1000" step="1" defaultValue={property.guestCapacity ?? ""} /></label>
                                </>
                              ) : (
                                <>
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
                                </>
                              )
                            }
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
                          <label>Listing Status<select name="status" defaultValue={property.status === "pending" ? "published" : property.status}><option value="published">Published (Visible on site)</option><option value="pending">Pending Admin Review</option><option value="hidden">Hidden from site</option></select></label>
                          <button type="button" className="admin-visibility-button" disabled={busyId === property.id} onClick={() => void (property.status === "pending" ? approveListing(property.id) : toggleListingVisibility(property.id, property.status !== "published"))}>{property.status === "pending" ? "✅ Approve and publish listing" : property.status === "hidden" ? "Show this listing on website" : "Hide this listing from website"}</button>
                          <button type="button" className="admin-visibility-button" aria-pressed={property.showPhone !== false} disabled={busyId === property.id} onClick={() => void toggleListingPhoneVisibility(property.id, property.showPhone === false)}>{property.showPhone === false ? "Show phone on this listing" : "Hide phone on this listing"}</button>
                          <label className="admin-checkbox">Verified seller<input type="checkbox" name="verified" defaultChecked={property.verified} /></label>
                          <AdminListingMediaManager title={property.title} initialImages={property.images?.length ? property.images : property.image ? [property.image] : []} initialVideos={property.videos ?? []} disabled={busyId === property.id} />
                          <label className="admin-wide">Description<textarea name="description" rows={3} required defaultValue={property.description} /></label>
                        </div>
                        <button className="button button-dark admin-save" disabled={busyId === property.id}>{busyId === property.id ? "Saving…" : "Save listing"}</button>
                      </form>
                    </details>
                  ))}
                {!data.properties.some((property) => listingTab === "hidden" ? property.status === "hidden" : listingTab === "pending" ? property.status === "pending" || Boolean(property.deleteRequestedAt) : property.status === "published" && (property.listingCategory ?? "sale") === listingTab) && (
                  <p className="admin-empty">{listingTab === "hidden" ? "There are no hidden listings." : listingTab === "pending" ? "No listings or deletion requests are waiting for review." : `No visible ${listingTab === "sale" ? "sale" : "rental"} listings yet.`}</p>
                )}
              </div>
            </div>
          )}

          {section === "users" && (
            <div id="admin-section-users" className="admin-record-list">
              {data.users.filter((user) => user.email !== "pavansai580@gmail.com" || user.id === profileFocusId).map((user) => (
                <form className={`admin-record admin-user-record${user.id === profileFocusId ? " is-profile-focus" : ""}`} data-admin-user-id={user.id} key={user.id} onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void update("user", user.id, { name: form.get("name"), email: form.get("email") });
                }}>
                  <div className="admin-record-top">
                    <div>
                      <span className="eyebrow">{user.listingCount} LISTINGS · ACCOUNT CREATED {formatAdminDate(user.createdAt)}</span>
                      <strong>{user.name}</strong>
                      <span>{user.phone ? <a href={`tel:${user.phone}`}>{user.phone}</a> : "Phone number not added"}</span>
                    </div>
                    {user.email !== "pavansai580@gmail.com" && (
                      <button type="button" className="admin-delete" disabled={busyId === user.id} onClick={() => void remove("user", user.id)}>Delete account</button>
                    )}
                  </div>
                  <div className="admin-form-grid">
                    <label>Name<input name="name" required defaultValue={user.name} /></label>
                    <label>Email <span className="optional-label">optional</span><input name="email" type="email" defaultValue={user.email} placeholder="No email; phone login only" /></label>
                  </div>
                  <button className="button button-dark admin-save" disabled={busyId === user.id}>{busyId === user.id ? "Saving…" : "Save member"}</button>
                  {(() => {
                    const memberListings = data.properties.filter(
                      (prop) => prop.ownerId === user.id || prop.owner === user.name || (user.phone && prop.phone === user.phone)
                    );
                    return (
                      <div className="admin-member-listings-box">
                        <div className="admin-member-listings-header">
                          <strong>Member&apos;s listings ({memberListings.length})</strong>
                          <span className="eyebrow">{memberListings.length ? "CLICK TO VISIT OR EDIT IN ADMIN" : "NO LISTINGS"}</span>
                        </div>
                        {memberListings.length ? (
                          <div className="admin-member-listings-grid">
                            {memberListings.map((prop) => (
                              <div className="admin-member-listing-card" key={prop.id}>
                                <div
                                  className="admin-member-listing-img"
                                  style={{ backgroundImage: `url("${prop.images?.[0] || prop.image || ""}")` }}
                                />
                                <div className="admin-member-listing-content">
                                  <div className="admin-member-listing-tag-row">
                                    <span className={`admin-status-pill status-${prop.status || "published"}`}>
                                      {prop.deleteRequestedAt
                                        ? "DELETION REQUESTED"
                                        : prop.status === "pending"
                                        ? "PENDING REVIEW"
                                        : prop.status === "hidden"
                                        ? "HIDDEN"
                                        : "PUBLISHED"}
                                    </span>
                                    <span className="admin-cat-pill">{prop.listingCategory === "rent" ? "RENT" : "SALE"} · {prop.type}</span>
                                  </div>
                                  <strong className="admin-member-listing-name">{prop.title}</strong>
                                  <span className="admin-member-listing-price">
                                    {formatListingPrice(prop)} · {prop.area} {prop.unit} · {prop.locality}, {prop.city}
                                  </span>
                                  <div className="admin-member-listing-btns">
                                    <a
                                      href={`/properties/${encodeURIComponent(prop.id)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="admin-member-visit-btn"
                                      title="Open live listing on website"
                                    >
                                      Visit listing ↗
                                    </a>
                                    <button
                                      type="button"
                                      className="admin-member-edit-btn"
                                      onClick={() => jumpToAdminListing(prop)}
                                      title="Edit this listing in Admin panel"
                                    >
                                      Edit in Admin
                                    </button>
                                    {prop.status === "pending" && (
                                      <button
                                        type="button"
                                        className="admin-member-edit-btn"
                                        style={{ background: "#059669", color: "#fff", borderColor: "#059669", fontWeight: 700 }}
                                        disabled={busyId === prop.id}
                                        onClick={() => void approveListing(prop.id)}
                                        title="Approve and publish listing immediately"
                                      >
                                        ✅ Approve
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="admin-member-no-listings">This member does not have any listings yet.</p>
                        )}
                      </div>
                    );
                  })()}
                  <details className="member-activity" open={user.id === profileFocusId}>
                    <summary>Full activity log · {activityForUser(user.id).length} events</summary>
                    {activityForUser(user.id).length ? (
                      <ol>
                        {activityForUser(user.id).map((activity) => (
                          <li key={activity.id}>
                            <time dateTime={activity.createdAt}>{formatAdminDate(activity.createdAt)}</time>
                            <strong>{activity.action}</strong>
                            {(activity.propertyTitle || activity.details) && <span>{[activity.propertyTitle, activity.details].filter(Boolean).join(" · ")}</span>}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p>No activity recorded for this member yet.</p>
                    )}
                  </details>
                </form>
              ))}
            </div>
          )}

          {section === "inquiries" && (
            <div id="admin-section-inquiries" className="admin-record-list">
              {data.inquiries.map((inquiry) => (
                <article className="admin-record admin-inquiry" key={inquiry.id}>
                  <div className="admin-record-top">
                    <div>
                      <span className="eyebrow">
                        {inquiry.email ? "ACCOUNT ENQUIRY" : "LEGACY ENQUIRY"}
                        {inquiry.emailStatus ? ` · EMAIL ${inquiry.emailStatus.toUpperCase()}` : ""} · {formatAdminDate(inquiry.createdAt)}
                      </span>
                      <strong>{inquiry.propertyTitle}</strong>
                    </div>
                    <button type="button" className="admin-delete" disabled={busyId === inquiry.id} onClick={() => void remove("inquiry", inquiry.id)}>Delete</button>
                  </div>
                  <div className="admin-inquiry-contact">
                    <strong>{inquiry.name}</strong>
                    {inquiry.email ? <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a> : <span>Email not available</span>}
                    {inquiry.phone && <a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a>}
                    <span>{inquiry.userId ? "Account linked" : inquiry.email ? "Account removed; contact snapshot retained" : "Submitted before account sign-in was required"}</span>
                  </div>
                  <p>{inquiry.message}</p>
                </article>
              ))}
            </div>
          )}

          {section === "reviews" && (
            <div id="admin-section-reviews" className="admin-record-list">
              {data.reviews.length ? (
                data.reviews.map((review) => (
                  <article className="admin-record admin-review" key={review.id}>
                    <div className="admin-record-top">
                      <div>
                        <span className="eyebrow">{review.reviewerName} · {review.rating}/5 · {formatAdminDate(review.updatedAt ?? review.createdAt)}</span>
                        <strong>{review.propertyTitle}</strong>
                      </div>
                      <button type="button" className="admin-delete" disabled={busyId === review.id} onClick={() => void remove("review", review.id)}>Delete review</button>
                    </div>
                    <p>{review.comment}</p>
                  </article>
                ))
              ) : (
                <p className="admin-empty">No reviews have been posted yet.</p>
              )}
            </div>
          )}

          {section === "phoneClicks" && (
            <div id="admin-section-phoneClicks" className="admin-record-list">
              {data.phoneClicks.length ? (
                data.phoneClicks.map((click) => (
                  <article className="admin-record admin-phone-click" key={click.id}>
                    <div className="admin-record-top">
                      <div>
                        <span className="eyebrow">
                          {formatAdminDate(click.createdAt)} · {click.contactMethod === "whatsapp" ? "WHATSAPP TO 8074399963" : "PHONE NUMBER CLICK"} · {click.userId ? "SIGNED-IN USER" : "GUEST VISITOR"}
                        </span>
                        <strong>{click.propertyTitle}</strong>
                      </div>
                      <Link className="text-link" href={`/properties/${encodeURIComponent(click.propertyId)}`} target="_blank">View listing</Link>
                    </div>
                    <div className="admin-inquiry-contact">
                      <span>Visitor: {click.visitorProfileId ? <button type="button" className="admin-profile-link" onClick={() => openUserProfile(click.visitorProfileId!)}>{click.userName || "View visitor profile"}</button> : <strong>{click.userName || `Guest ${click.visitorId.slice(0, 8)}`}</strong>}</span>
                      {click.userPhone && <span>Phone: {click.userPhone}</span>}
                      <span>Seller: {click.sellerId ? <button type="button" className="admin-profile-link" onClick={() => openUserProfile(click.sellerId!)}>{click.sellerName}</button> : <strong>{click.sellerName}</strong>}</span>
                    </div>
                  </article>
                ))
              ) : (
                <p className="admin-empty">No seller phone clicks have been recorded yet.</p>
              )}
            </div>
          )}

          {section === "activity" && (
            <div id="admin-section-activity">
              <div className="admin-site-activity-heading">
                <div>
                  <span className="eyebrow">USER JOURNEY</span>
                  <h2>All site activity · newest first</h2>
                  <p>Page views and actions from members and guest visitors.</p>
                </div>
                <button type="button" className="button button-outline" onClick={() => void load()}>Refresh log</button>
              </div>
              <div className="admin-record-list admin-site-activity-list">
                {data.siteActivity.length ? (
                  data.siteActivity.map((activity) => (
                    <article className="admin-record admin-site-activity" key={activity.id}>
                      <time dateTime={activity.createdAt}>{formatAdminDate(activity.createdAt)}</time>
                      <div className="admin-site-activity-actor">
                        {activity.userId ? <button type="button" className="admin-profile-link" onClick={() => openUserProfile(activity.userId!)}>{activity.actorName || "Member profile"}</button> : <strong>{activity.actorName || `Guest ${activity.visitorId.slice(0, 8)}`}</strong>}
                        {!activity.userId && activity.visitorId && <small>Visitor ID {activity.visitorId.slice(0, 8)}</small>}
                      </div>
                      <div className="admin-site-activity-content">
                        <strong>{activity.action}</strong>
                        {activity.details && <span>{activity.details}</span>}
                        {activity.propertyTitle && activity.propertyId && <Link href={`/properties/${encodeURIComponent(activity.propertyId)}`} target="_blank">{activity.propertyTitle}</Link>}
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="admin-empty">No activity recorded yet.</p>
                )}
              </div>
            </div>
          )}

          {section === "users" && (
            <section className="admin-record-list admin-notifications">
              <h2>Registration email delivery</h2>
              {data.registrationNotifications.length ? (
                data.registrationNotifications.map((notice) => (
                  <article className="admin-record" key={notice.id}>
                    <div className="admin-record-top">
                      <div>
                        <span className="eyebrow">{notice.status === "sent" ? `SENT ${notice.sentAt ? new Date(notice.sentAt).toLocaleString() : ""}` : "QUEUED"}</span>
                        <strong>{notice.name}</strong>
                      </div>
                      <span>{notice.email}</span>
                    </div>
                    {notice.status === "pending" && <p>Attempts: {notice.attempts}. {notice.lastError ?? "Waiting for mail configuration."}</p>}
                  </article>
                ))
              ) : (
                <p className="admin-empty">No registration notifications yet.</p>
              )}
            </section>
          )}
        </>
      )}
    </section>
  );
}
