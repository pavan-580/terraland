import "server-only";
import { db } from "@/lib/db";
import { formatListingPrice, type ListingCategory, type PricePeriod } from "@/lib/market";

const registrationRecipient = "pavansai580@gmail.com";

export async function sendPasswordResetCode(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Password reset email is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your Terraland password reset code",
      text: `Your Terraland password reset code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
      html: `<p>Your Terraland password reset code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("Password reset email delivery failed:", response.status, detail);
    throw new Error("Password reset email could not be delivered.");
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export async function sendRegistrationNotice(name: string, email: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("Registration email is not configured. Set RESEND_API_KEY and EMAIL_FROM.");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [registrationRecipient],
      subject: "New Terraland account registration",
      text: `A new account was registered.\nName: ${name}\nEmail: ${email}`,
      html: `<p>A new account was registered.</p><p><strong>Name:</strong> ${escapeHtml(name)}<br><strong>Email:</strong> ${escapeHtml(email)}</p>`,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("Registration email delivery failed:", response.status, detail);
    throw new Error("The registration notification could not be delivered. Please try again later.");
  }
}

export type InquiryNotice = {
  propertyId: string;
  name: string;
  email: string;
  message: string;
  propertyTitle: string;
  propertyType: string;
  listingCategory: ListingCategory;
  pricePeriod: PricePeriod;
  availability: string;
  guestCapacity: number | null;
  city: string;
  locality: string;
  price: number;
  area: number;
  unit: string;
  address: string;
  mapUrl: string;
  createdAt: string;
};

export async function sendInquiryNotice(inquiry: InquiryNotice) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("Enquiry email is not configured. Set RESEND_API_KEY and EMAIL_FROM.");
  }
  const propertyUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "")}/properties/${encodeURIComponent(inquiry.propertyId)}`
    : "";
  const price = formatListingPrice({ price: inquiry.price, listingCategory: inquiry.listingCategory, pricePeriod: inquiry.pricePeriod });
  const categoryLabel = inquiry.listingCategory === "rent" ? "Rental" : "For sale";
  const rows = [
    ["Buyer name", inquiry.name],
    ["Buyer email", inquiry.email],
    ["Property", inquiry.propertyTitle],
    ["Listing type", `${categoryLabel} · ${inquiry.propertyType}`],
    ["Location", `${inquiry.locality}, ${inquiry.city}`],
    ["Size", `${inquiry.area} ${inquiry.unit}`],
    ["Price or rate", price],
    ["Availability / rental terms", inquiry.availability],
    ["Guest capacity", inquiry.guestCapacity ? `${inquiry.guestCapacity} guests` : ""],
    ["Address", inquiry.address],
    ["Google Maps", inquiry.mapUrl],
    ["Enquiry", inquiry.message],
    ["Received", inquiry.createdAt],
  ].filter(([, value]) => value);
  const text = `New Terraland ${categoryLabel.toLowerCase()} enquiry\n\n${rows.map(([label, value]) => `${label}: ${value}`).join("\n")}${propertyUrl ? `\n\nListing page: ${propertyUrl}` : ""}`;
  const html = `<h2>New Terraland ${escapeHtml(categoryLabel.toLowerCase())} enquiry</h2><table>${rows.map(([label, value]) => `<tr><th align="left" valign="top">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</table>${propertyUrl ? `<p><a href="${escapeHtml(propertyUrl)}">Open listing</a></p>` : ""}`;
  const authorization = ["Bearer", apiKey].join(" ");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [registrationRecipient],
      reply_to: inquiry.email,
      subject: `New ${categoryLabel.toLowerCase()} enquiry: ${inquiry.propertyTitle}`,
      text,
      html,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("Property enquiry email delivery failed:", response.status, detail);
    throw new Error("The enquiry email could not be delivered.");
  }
}

export async function deliverPendingRegistrationNotices(notificationId?: string) {
  const pending = db.prepare(`
    SELECT id, name, email FROM registration_notifications
    WHERE status = 'pending' AND (? IS NULL OR id = ?)
    ORDER BY createdAt ASC
  `).all(notificationId ?? null, notificationId ?? null) as { id: string; name: string; email: string }[];
  let sent = 0;
  let failed = 0;
  const markAttempt = db.prepare(`
    UPDATE registration_notifications SET attempts = attempts + 1 WHERE id = ?
  `);
  const markSent = db.prepare(`
    UPDATE registration_notifications SET status = 'sent', lastError = NULL, sentAt = CURRENT_TIMESTAMP WHERE id = ?
  `);
  const markFailed = db.prepare(`
    UPDATE registration_notifications SET lastError = ? WHERE id = ?
  `);
  for (const notice of pending) {
    markAttempt.run(notice.id);
    try {
      await sendRegistrationNotice(notice.name, notice.email);
      markSent.run(notice.id);
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown email delivery failure.";
      markFailed.run(message.slice(0, 500), notice.id);
      console.error(`Registration notification ${notice.id} remains queued:`, error);
      failed += 1;
    }
  }
  return { sent, failed, pending: pending.length - sent };
}

export async function deliverPendingInquiryNotices(inquiryId?: string) {
  const pending = db.prepare(`
    SELECT inquiry_notifications.id AS notificationId, inquiries.id, inquiries.propertyId, inquiries.name, inquiries.email,
      inquiries.message, inquiries.createdAt, properties.title AS propertyTitle, properties.type AS propertyType,
      properties.city, properties.locality, properties.price, properties.area, properties.unit,
      properties.listingCategory, properties.pricePeriod, properties.availability, properties.guestCapacity,
      properties.address, properties.mapUrl
    FROM inquiry_notifications
    JOIN inquiries ON inquiries.id = inquiry_notifications.inquiryId
    JOIN properties ON properties.id = inquiries.propertyId
    WHERE inquiry_notifications.status = 'pending' AND (? IS NULL OR inquiries.id = ?)
    ORDER BY inquiry_notifications.createdAt ASC
  `).all(inquiryId ?? null, inquiryId ?? null) as (InquiryNotice & { id: string; notificationId: string })[];
  let sent = 0;
  const markAttempt = db.prepare("UPDATE inquiry_notifications SET attempts = attempts + 1 WHERE id = ?");
  const markSent = db.prepare("UPDATE inquiry_notifications SET status = 'sent', lastError = NULL, sentAt = CURRENT_TIMESTAMP WHERE id = ?");
  const markFailed = db.prepare("UPDATE inquiry_notifications SET lastError = ? WHERE id = ?");
  for (const notice of pending) {
    markAttempt.run(notice.notificationId);
    try {
      await sendInquiryNotice(notice);
      markSent.run(notice.notificationId);
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown email delivery failure.";
      markFailed.run(message.slice(0, 500), notice.notificationId);
      console.error(`Enquiry notification ${notice.id} remains queued:`, error);
    }
  }
  return { sent, failed: pending.length - sent, pending: pending.length - sent };
}
