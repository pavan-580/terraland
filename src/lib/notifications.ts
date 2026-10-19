import "server-only";
import { db } from "@/lib/db";
import { formatListingPrice, type ListingCategory, type PricePeriod } from "@/lib/market";

export const PRIMARY_ADMIN_EMAIL = "pavansai580@gmail.com";

export function getAdminRecipients(): string[] {
  const envAdmin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const set = new Set<string>([PRIMARY_ADMIN_EMAIL]);
  if (envAdmin && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(envAdmin)) {
    set.add(envAdmin);
  }
  return Array.from(set);
}

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
  if (raw) return raw.replace(/\/+$/, "");
  return "https://nkart.store";
}

export function getWhatsAppLink(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, "");
  const num = digits.length === 10 ? `91${digits}` : digits;
  if (!num) return "";
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${num}${query}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function renderEmailLayout({
  headline,
  eyebrow = "TERRALAND NOTIFICATION",
  primaryCta,
  secondaryCta,
  whatsappCta,
  rows,
}: {
  headline: string;
  eyebrow?: string;
  primaryCta?: { label: string; url: string; color?: string };
  secondaryCta?: { label: string; url: string; color?: string };
  whatsappCta?: { label: string; url: string };
  rows: [string, string][];
}) {
  const buttons: string[] = [];
  if (primaryCta) {
    buttons.push(`<a href="${escapeHtml(primaryCta.url)}" style="display:inline-block;background:${primaryCta.color || '#0F5132'};color:#ffffff;padding:11px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;margin-right:8px;margin-bottom:8px;">${escapeHtml(primaryCta.label)}</a>`);
  }
  if (whatsappCta) {
    buttons.push(`<a href="${escapeHtml(whatsappCta.url)}" style="display:inline-block;background:#25D366;color:#ffffff;padding:11px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;margin-right:8px;margin-bottom:8px;">${escapeHtml(whatsappCta.label)}</a>`);
  }
  if (secondaryCta) {
    buttons.push(`<a href="${escapeHtml(secondaryCta.url)}" style="display:inline-block;background:${secondaryCta.color || '#1F2937'};color:#ffffff;padding:11px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;margin-right:8px;margin-bottom:8px;">${escapeHtml(secondaryCta.label)}</a>`);
  }

  const tableRows = rows.map(([label, valueHtml]) => `
    <tr>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;width:34%;vertical-align:top;font-size:13px;background:#f9fafb;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:13px;vertical-align:top;word-break:break-word;">
        ${valueHtml}
      </td>
    </tr>
  `).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:20px 10px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,0.06);border:1px solid #e5e7eb;">
        <div style="background:#0b3b24;background-image:linear-gradient(135deg,#0b3b24,#155d39);padding:20px 24px;color:#ffffff;">
          <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#c6dc81;font-weight:700;margin-bottom:4px;">
            ${escapeHtml(eyebrow)}
          </div>
          <h1 style="margin:0;font-size:19px;font-weight:700;color:#ffffff;line-height:1.3;">
            ${escapeHtml(headline)}
          </h1>
        </div>
        <div style="padding:20px 24px;">
          ${buttons.length ? `<div style="margin-bottom:18px;">${buttons.join("")}</div>` : ""}
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
            ${tableRows}
          </table>
          <div style="margin-top:20px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;text-align:center;">
            Terraland Real Estate · Miyapur, Hyderabad<br>
            Direct lead notification dispatched to Founder: <a href="mailto:${PRIMARY_ADMIN_EMAIL}" style="color:#0b3b24;font-weight:600;text-decoration:none;">${PRIMARY_ADMIN_EMAIL}</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `.trim();
}

export async function sendPasswordResetCode(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.log(`\n======================================================`);
    console.log(`🔑 [NILAY PASSWORD RESET CODE]`);
    console.log(`Recipient: ${email}`);
    console.log(`Verification Code: ${code}`);
    console.log(`Expires in: 10 minutes`);
    console.log(`(Configure RESEND_API_KEY and EMAIL_FROM in .env.local to send real emails)`);
    console.log(`======================================================\n`);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your NILAY password reset code",
      text: `Your NILAY password reset code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
      html: `<div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:10px;">
        <h2 style="color:#111827;margin-top:0;">Reset your NILAY password</h2>
        <p style="color:#4b5563;font-size:14px;line-height:1.5;">Enter the six-digit verification code below to reset your password:</p>
        <div style="background:#f3f4f6;padding:16px;text-align:center;border-radius:8px;margin:20px 0;">
          <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#111827;font-family:monospace;">${code}</span>
        </div>
        <p style="color:#6b7280;font-size:12px;">This code will expire in 10 minutes. If you didn't request this password reset, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
        <p style="color:#9ca3af;font-size:11px;margin:0;">NILAY · Verified plots in Miyapur, Hyderabad</p>
      </div>`,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("Password reset email delivery failed:", response.status, detail);
    throw new Error("Password reset email could not be delivered.");
  }
}

export async function sendRegistrationNotice(name: string, email: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("Registration email is not configured. Set RESEND_API_KEY and EMAIL_FROM.");
  }

  const siteUrl = getSiteUrl();
  const crmUrl = `${siteUrl}/admin`;
  const recipients = getAdminRecipients();

  const rows: [string, string][] = [
    ["Member Name", escapeHtml(name)],
    ["Member Email", `<a href="mailto:${escapeHtml(email)}" style="color:#0b3b24;font-weight:600;">${escapeHtml(email)}</a>`],
    ["Account Type", "Standard Member"],
    ["Admin CRM", `<a href="${escapeHtml(crmUrl)}" style="color:#0b3b24;font-weight:600;">View in Admin CRM</a>`],
    ["Registered At", escapeHtml(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))],
  ];

  const html = renderEmailLayout({
    eyebrow: "NEW USER REGISTRATION",
    headline: `New Terraland Member: ${name}`,
    primaryCta: { label: "Open Admin Dashboard →", url: crmUrl },
    rows,
  });

  const text = `New Terraland account registered:\n\nName: ${name}\nEmail: ${email}\nAdmin CRM: ${crmUrl}\nDelivered to: ${recipients.join(", ")}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: `New Terraland Registration: ${name} (${email})`,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Registration email delivery failed:", response.status, detail);
    throw new Error("The registration notification could not be delivered. Please try again later.");
  }
}

export async function sendLenderInterestNotice(lead: { name: string; email: string; phone: string; amount: number; message: string; createdAt: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Lender interest email is not configured.");

  const amountStr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(lead.amount);
  const siteUrl = getSiteUrl();
  const crmUrl = `${siteUrl}/admin`;
  const waLink = getWhatsAppLink(lead.phone, `Hi ${lead.name}, regarding your lender financing inquiry on Terraland...`);
  const recipients = getAdminRecipients();

  const rows: [string, string][] = [
    ["Lender Name", escapeHtml(lead.name)],
    ["Phone Number", `<a href="tel:${escapeHtml(lead.phone)}" style="color:#0b3b24;font-weight:600;">${escapeHtml(lead.phone)}</a>`],
    ...(waLink ? [["WhatsApp Chat", `<a href="${escapeHtml(waLink)}" style="color:#25D366;font-weight:bold;">Open WhatsApp Chat →</a>`] as [string, string]] : []),
    ["Email Address", `<a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a>`],
    ["Lending Capacity", `<strong style="color:#0b3b24;font-size:15px;">${escapeHtml(amountStr)}</strong>`],
    ["Proposal / Details", escapeHtml(lead.message || "No additional comments")],
    ["Received Timestamp", escapeHtml(lead.createdAt)],
  ];

  const html = renderEmailLayout({
    eyebrow: "LENDER / INVESTOR INTEREST",
    headline: `New Lender Interest: ${lead.name} (${amountStr})`,
    primaryCta: { label: "Open Admin CRM →", url: crmUrl },
    whatsappCta: waLink ? { label: "Chat on WhatsApp →", url: waLink } : undefined,
    rows,
  });

  const text = `New Lender Interest Registered on Terraland\n\nName: ${lead.name}\nPhone: ${lead.phone}\nEmail: ${lead.email}\nAmount: ${amountStr}\nDetails: ${lead.message}\nReceived: ${lead.createdAt}\nCRM: ${crmUrl}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: recipients,
      reply_to: lead.email,
      subject: `New Lender Interest: ${lead.name} (${amountStr})`,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Lender interest notification failed:", response.status, detail);
    throw new Error("The lender interest notification could not be delivered.");
  }
}

export type InquiryNotice = {
  propertyId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  contactMethod?: string;
  preferredTimeline?: string;
  fundingReadiness?: string;
  source?: string;
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

  const siteUrl = getSiteUrl();
  const propertyUrl = `${siteUrl}/properties/${encodeURIComponent(inquiry.propertyId)}`;
  const adminUrl = `${siteUrl}/admin`;
  const price = formatListingPrice({ price: inquiry.price, listingCategory: inquiry.listingCategory, pricePeriod: inquiry.pricePeriod });
  const categoryLabel = inquiry.listingCategory === "rent" ? "Rental" : "Residential Plot";
  const waLink = getWhatsAppLink(inquiry.phone, `Hi ${inquiry.name}, regarding your enquiry on Terraland for ${inquiry.propertyTitle}...`);
  const recipients = getAdminRecipients();

  const rows: [string, string][] = [
    ["Buyer Name", escapeHtml(inquiry.name)],
    ["Phone Number", `<a href="tel:${escapeHtml(inquiry.phone)}" style="color:#0b3b24;font-weight:600;">${escapeHtml(inquiry.phone)}</a>`],
    ...(waLink ? [["WhatsApp Quick Chat", `<a href="${escapeHtml(waLink)}" style="color:#25D366;font-weight:bold;">Click here to chat on WhatsApp →</a>`] as [string, string]] : []),
    ["Email Address", inquiry.email ? `<a href="mailto:${escapeHtml(inquiry.email)}">${escapeHtml(inquiry.email)}</a>` : "Not provided"],
    ["Preferred Contact", escapeHtml(inquiry.contactMethod || "Phone")],
    ["Purchase Timeline", escapeHtml(inquiry.preferredTimeline || "Immediate / Flexible")],
    ["Funding Readiness", escapeHtml(inquiry.fundingReadiness || "Ready")],
    ["Enquiry Message", escapeHtml(inquiry.message)],
    ["Listing Title", `<strong>${escapeHtml(inquiry.propertyTitle)}</strong>`],
    ["Listing ID", `<code>${escapeHtml(inquiry.propertyId)}</code>`],
    ["Direct Listing URL", `<a href="${escapeHtml(propertyUrl)}" style="color:#0b3b24;font-weight:bold;text-decoration:underline;">${escapeHtml(propertyUrl)}</a>`],
    ["Location", escapeHtml(`${inquiry.locality}, ${inquiry.city}`)],
    ["Plot Size / Area", escapeHtml(`${inquiry.area} ${inquiry.unit}`)],
    ["Asking Price", `<strong style="color:#0b3b24;">${escapeHtml(price)}</strong>`],
    ["Availability", escapeHtml(inquiry.availability || "Available")],
    ...(inquiry.address ? [["Property Address", escapeHtml(inquiry.address)] as [string, string]] : []),
    ...(inquiry.mapUrl ? [["Google Maps Location", `<a href="${escapeHtml(inquiry.mapUrl)}" target="_blank" style="color:#1a73e8;">View Coordinates / Map</a>`] as [string, string]] : []),
    ["Submission Source", escapeHtml(inquiry.source || "Website Listing Page")],
    ["Received Timestamp", escapeHtml(inquiry.createdAt)],
  ];

  const html = renderEmailLayout({
    eyebrow: `NEW ${categoryLabel.toUpperCase()} ENQUIRY`,
    headline: `Enquiry: ${inquiry.propertyTitle} (${inquiry.name})`,
    primaryCta: { label: "View Listing on Terraland →", url: propertyUrl },
    whatsappCta: waLink ? { label: "Chat on WhatsApp →", url: waLink } : undefined,
    secondaryCta: { label: "Open Admin CRM →", url: adminUrl },
    rows,
  });

  const textRows = [
    `CUSTOMER DETAILS:`,
    `- Buyer Name: ${inquiry.name}`,
    `- Phone: ${inquiry.phone}`,
    `- WhatsApp Chat: ${waLink || "N/A"}`,
    `- Email: ${inquiry.email || "Not provided"}`,
    `- Preferred Contact: ${inquiry.contactMethod || "Phone"}`,
    `- Timeline: ${inquiry.preferredTimeline || "Immediate / Flexible"}`,
    `- Funding Readiness: ${inquiry.fundingReadiness || "Ready"}`,
    `- Message: ${inquiry.message}`,
    ``,
    `LISTING DETAILS:`,
    `- Listing Title: ${inquiry.propertyTitle}`,
    `- Listing ID: ${inquiry.propertyId}`,
    `- DIRECT LISTING URL: ${propertyUrl}`,
    `- Location: ${inquiry.locality}, ${inquiry.city}`,
    `- Size: ${inquiry.area} ${inquiry.unit}`,
    `- Price: ${price}`,
    `- Address: ${inquiry.address || "N/A"}`,
    `- Google Maps: ${inquiry.mapUrl || "N/A"}`,
    ``,
    `Delivered to: ${recipients.join(", ")}`,
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: recipients,
      ...(inquiry.email ? { reply_to: inquiry.email } : {}),
      subject: `[Terraland Enquiry] ${inquiry.name} on ${inquiry.propertyTitle}`,
      text: textRows,
      html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Property enquiry email delivery failed:", response.status, detail);
    throw new Error("The enquiry email could not be delivered.");
  }

  // Also dispatch enquiry confirmation email to the customer based on their details
  try {
    await sendCustomerInquiryConfirmation(inquiry);
  } catch (customerEmailErr) {
    console.error("Failed to send enquiry confirmation to customer:", customerEmailErr);
  }
}

export async function sendCustomerInquiryConfirmation(inquiry: InquiryNotice) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return;
  }
  if (!inquiry.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email.trim())) {
    return;
  }

  const siteUrl = getSiteUrl();
  const propertyUrl = `${siteUrl}/properties/${encodeURIComponent(inquiry.propertyId)}`;
  const price = formatListingPrice({ price: inquiry.price, listingCategory: inquiry.listingCategory, pricePeriod: inquiry.pricePeriod });
  const terralandWhatsApp = getWhatsAppLink("9494458000", `Hi Terraland, I submitted an enquiry for ${inquiry.propertyTitle} (ID: ${inquiry.propertyId}).`);

  const rows: [string, string][] = [
    ["Property Selected", `<strong>${escapeHtml(inquiry.propertyTitle)}</strong>`],
    ["Direct Listing URL", `<a href="${escapeHtml(propertyUrl)}" style="color:#0b3b24;font-weight:bold;text-decoration:underline;">${escapeHtml(propertyUrl)}</a>`],
    ["Location", escapeHtml(`${inquiry.locality}, ${inquiry.city}`)],
    ["Plot Size / Area", escapeHtml(`${inquiry.area} ${inquiry.unit}`)],
    ["Price / Budget", `<strong style="color:#0b3b24;">${escapeHtml(price)}</strong>`],
    ["Your Submitted Message", escapeHtml(inquiry.message)],
    ["Your Contact Number", escapeHtml(inquiry.phone)],
    ["Preferred Contact", escapeHtml(inquiry.contactMethod || "Phone")],
    ["Your Purchase Timeline", escapeHtml(inquiry.preferredTimeline || "Immediate / Flexible")],
    ["Terraland Founder / Office", `Terraland Miyapur Real Estate<br>Founder: <a href="mailto:${PRIMARY_ADMIN_EMAIL}" style="color:#0b3b24;font-weight:600;">${PRIMARY_ADMIN_EMAIL}</a><br>WhatsApp / Call: +91 94944 58000`],
  ];

  const html = renderEmailLayout({
    eyebrow: "ENQUIRY CONFIRMATION · TERRALAND",
    headline: `We received your enquiry for ${inquiry.propertyTitle}`,
    primaryCta: { label: "View Property on Terraland →", url: propertyUrl },
    whatsappCta: terralandWhatsApp ? { label: "Chat on WhatsApp →", url: terralandWhatsApp } : undefined,
    rows,
  });

  const textRows = [
    `Dear ${inquiry.name},`,
    ``,
    `Thank you for contacting Terraland regarding "${inquiry.propertyTitle}".`,
    `We have received your enquiry and our verified land advisory team in Miyapur is reviewing your request.`,
    ``,
    `ENQUIRY DETAILS:`,
    `- Property: ${inquiry.propertyTitle}`,
    `- Direct Listing URL: ${propertyUrl}`,
    `- Location: ${inquiry.locality}, ${inquiry.city}`,
    `- Size: ${inquiry.area} ${inquiry.unit}`,
    `- Price: ${price}`,
    `- Your Message: ${inquiry.message}`,
    `- Your Phone: ${inquiry.phone}`,
    `- Timeline: ${inquiry.preferredTimeline || "Immediate / Flexible"}`,
    ``,
    `TERRALAND ADVISORY & SUPPORT:`,
    `- Founder: ${PRIMARY_ADMIN_EMAIL}`,
    `- Office: Miyapur, Hyderabad, Telangana`,
    `- WhatsApp: https://wa.me/919494458000`,
    ``,
    `Warm regards,`,
    `The Terraland Real Estate Team`,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [inquiry.email.trim()],
        reply_to: PRIMARY_ADMIN_EMAIL,
        subject: `[Terraland Confirmation] Enquiry received for ${inquiry.propertyTitle}`,
        text: textRows,
        html,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Customer inquiry confirmation delivery error:", res.status, errText);
    }
  } catch (err) {
    console.error("Failed to send customer inquiry confirmation:", err);
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
  const markAttempt = db.prepare("UPDATE registration_notifications SET attempts = attempts + 1 WHERE id = ?");
  const markSent = db.prepare("UPDATE registration_notifications SET status = 'sent', lastError = NULL, sentAt = CURRENT_TIMESTAMP WHERE id = ?");
  const markFailed = db.prepare("UPDATE registration_notifications SET lastError = ? WHERE id = ?");
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
    SELECT inquiry_notifications.id AS notificationId, inquiries.id, inquiries.propertyId, inquiries.name, inquiries.email, inquiries.phone,
      inquiries.message, inquiries.contactMethod, inquiries.preferredTimeline, inquiries.fundingReadiness, inquiries.source,
      inquiries.createdAt, properties.title AS propertyTitle, properties.type AS propertyType,
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

export type BuyerRequirementNotice = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  preferredLocation: string;
  minBudget?: number;
  maxBudget?: number;
  minPlotSize?: number;
  maxPlotSize?: number;
  intendedUse?: string;
  timeline?: string;
  fundingReadiness?: string;
  preferredContactMethod?: string;
  notes?: string;
  source?: string;
  createdAt: string;
};

export async function sendBuyerRequirementNotice(req: BuyerRequirementNotice) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return;

  const siteUrl = getSiteUrl();
  const crmUrl = `${siteUrl}/admin`;
  const waLink = getWhatsAppLink(req.phone, `Hi ${req.name}, regarding your plot requirement in ${req.preferredLocation} on Terraland...`);
  const recipients = getAdminRecipients();

  const budgetStr = (req.minBudget || req.maxBudget)
    ? `₹${(req.minBudget || 0).toLocaleString("en-IN")} - ₹${(req.maxBudget || 0).toLocaleString("en-IN")}`
    : "Flexible / Not specified";

  const sizeStr = (req.minPlotSize || req.maxPlotSize)
    ? `${req.minPlotSize || 0} - ${req.maxPlotSize || 0} sq. yds`
    : "Flexible / Not specified";

  const rows: [string, string][] = [
    ["Buyer Name", escapeHtml(req.name)],
    ["Phone Number", `<a href="tel:${escapeHtml(req.phone)}" style="color:#0b3b24;font-weight:600;">${escapeHtml(req.phone)}</a>`],
    ...(waLink ? [["WhatsApp Quick Chat", `<a href="${escapeHtml(waLink)}" style="color:#25D366;font-weight:bold;">Chat on WhatsApp →</a>`] as [string, string]] : []),
    ["Email Address", req.email ? `<a href="mailto:${escapeHtml(req.email)}">${escapeHtml(req.email)}</a>` : "Not provided"],
    ["Preferred Locality", `<strong>${escapeHtml(req.preferredLocation)}</strong>`],
    ["Budget Range", `<strong style="color:#0b3b24;">${escapeHtml(budgetStr)}</strong>`],
    ["Plot Size Range", escapeHtml(sizeStr)],
    ["Intended Use", escapeHtml(req.intendedUse || "Residential Construction")],
    ["Purchase Timeline", escapeHtml(req.timeline || "Immediate / Within 3 months")],
    ["Funding Readiness", escapeHtml(req.fundingReadiness || "Ready funds")],
    ["Preferred Contact", escapeHtml(req.preferredContactMethod || "Phone")],
    ["Source", escapeHtml(req.source || "Buyer Requirement Form")],
    ["Additional Notes", escapeHtml(req.notes || "None")],
    ["Submission ID", `<code>${escapeHtml(req.id)}</code>`],
    ["Received Timestamp", escapeHtml(req.createdAt)],
  ];

  const html = renderEmailLayout({
    eyebrow: "NEW BUYER REQUIREMENT",
    headline: `Buyer Matching: ${req.name} (${req.preferredLocation})`,
    primaryCta: { label: "Open Buyer CRM →", url: crmUrl },
    whatsappCta: waLink ? { label: "Chat on WhatsApp →", url: waLink } : undefined,
    rows,
  });

  const text = [
    `NEW BUYER REQUIREMENT REGISTERED:`,
    `- Buyer: ${req.name}`,
    `- Phone: ${req.phone}`,
    `- WhatsApp: ${waLink || "N/A"}`,
    `- Email: ${req.email || "Not provided"}`,
    `- Preferred Locality: ${req.preferredLocation}`,
    `- Budget: ${budgetStr}`,
    `- Plot Size: ${sizeStr}`,
    `- Intended Use: ${req.intendedUse || "Residential Construction"}`,
    `- Timeline: ${req.timeline || "Immediate / Within 3 months"}`,
    `- Funding Readiness: ${req.fundingReadiness || "Ready funds"}`,
    `- Notes: ${req.notes || "None"}`,
    `- CRM Link: ${crmUrl}`,
    `- Delivered to: ${recipients.join(", ")}`,
  ].join("\n");

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: recipients,
        ...(req.email ? { reply_to: req.email } : {}),
        subject: `[Terraland Match] New Buyer: ${req.name} for ${req.preferredLocation} (${budgetStr})`,
        text,
        html,
      }),
    });
  } catch (error) {
    console.error("Buyer requirement email failed:", error);
  }

  if (req.email) {
    try {
      await sendCustomerBuyerRequirementConfirmation(req);
    } catch (err) {
      console.error("Customer buyer requirement email confirmation error:", err);
    }
  }
}

export async function sendCustomerBuyerRequirementConfirmation(req: BuyerRequirementNotice) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from || !req.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.email.trim())) return;

  const siteUrl = getSiteUrl();
  const terralandWhatsApp = getWhatsAppLink("9494458000", `Hi Terraland, I registered a plot requirement for ${req.preferredLocation}.`);
  const budgetStr = (req.minBudget || req.maxBudget)
    ? `₹${(req.minBudget || 0).toLocaleString("en-IN")} - ₹${(req.maxBudget || 0).toLocaleString("en-IN")}`
    : "Flexible / Not specified";
  const sizeStr = (req.minPlotSize || req.maxPlotSize)
    ? `${req.minPlotSize || 0} - ${req.maxPlotSize || 0} sq. yds`
    : "Flexible / Not specified";

  const rows: [string, string][] = [
    ["Preferred Locality", `<strong>${escapeHtml(req.preferredLocation)}</strong>`],
    ["Budget Range", `<strong style="color:#0b3b24;">${escapeHtml(budgetStr)}</strong>`],
    ["Plot Size Range", escapeHtml(sizeStr)],
    ["Intended Use", escapeHtml(req.intendedUse || "Residential Construction")],
    ["Purchase Timeline", escapeHtml(req.timeline || "Immediate / Within 3 months")],
    ["Terraland Founder / Office", `Terraland Miyapur Real Estate<br>Founder: <a href="mailto:${PRIMARY_ADMIN_EMAIL}" style="color:#0b3b24;font-weight:600;">${PRIMARY_ADMIN_EMAIL}</a><br>WhatsApp / Call: +91 94944 58000`],
  ];

  const html = renderEmailLayout({
    eyebrow: "REQUIREMENT RECORDED · TERRALAND",
    headline: `We're finding matching plots for you in ${req.preferredLocation}`,
    primaryCta: { label: "Explore Current Listings →", url: `${siteUrl}/search?category=sale` },
    whatsappCta: terralandWhatsApp ? { label: "Chat on WhatsApp →", url: terralandWhatsApp } : undefined,
    rows,
  });

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [req.email.trim()],
        reply_to: PRIMARY_ADMIN_EMAIL,
        subject: `[Terraland] We received your plot requirement in ${req.preferredLocation}`,
        html,
      }),
    });
  } catch (err) {
    console.error("Customer buyer requirement email confirmation error:", err);
  }
}

export type SiteVisitNotice = {
  id: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  propertyPrice?: number;
  propertyArea?: number;
  propertyUnit?: string;
  proposedDate: string;
  proposedTime?: string;
  notes?: string;
  createdAt: string;
};

export async function sendSiteVisitNotice(visit: SiteVisitNotice) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return;

  const siteUrl = getSiteUrl();
  const propertyUrl = visit.propertyId ? `${siteUrl}/properties/${encodeURIComponent(visit.propertyId)}` : "";
  const adminUrl = `${siteUrl}/admin`;
  const waLink = getWhatsAppLink(visit.buyerPhone, `Hi ${visit.buyerName}, regarding your site visit request for ${visit.propertyTitle} on ${visit.proposedDate}...`);
  const recipients = getAdminRecipients();

  const priceFormatted = visit.propertyPrice ? `₹${visit.propertyPrice.toLocaleString("en-IN")}` : "";
  const sizeFormatted = visit.propertyArea ? `${visit.propertyArea} ${visit.propertyUnit || "sq. yds"}` : "";

  const rows: [string, string][] = [
    ["Buyer Name", escapeHtml(visit.buyerName)],
    ["Buyer Phone", `<a href="tel:${escapeHtml(visit.buyerPhone)}" style="color:#0b3b24;font-weight:600;">${escapeHtml(visit.buyerPhone)}</a>`],
    ...(waLink ? [["WhatsApp Direct Chat", `<a href="${escapeHtml(waLink)}" style="color:#25D366;font-weight:bold;">Chat on WhatsApp →</a>`] as [string, string]] : []),
    ...(visit.buyerEmail ? [["Buyer Email", `<a href="mailto:${escapeHtml(visit.buyerEmail)}">${escapeHtml(visit.buyerEmail)}</a>`] as [string, string]] : []),
    ["Requested Property", `<strong>${escapeHtml(visit.propertyTitle)}</strong>`],
    ["Property ID", `<code>${escapeHtml(visit.propertyId)}</code>`],
    ...(propertyUrl ? [["Direct Listing Link", `<a href="${escapeHtml(propertyUrl)}" style="color:#0b3b24;font-weight:bold;text-decoration:underline;">${escapeHtml(propertyUrl)}</a>`] as [string, string]] : []),
    ["Location", escapeHtml(visit.propertyLocation)],
    ...(priceFormatted ? [["Asking Price", escapeHtml(priceFormatted)] as [string, string]] : []),
    ...(sizeFormatted ? [["Plot Size", escapeHtml(sizeFormatted)] as [string, string]] : []),
    ["Requested Visit Date", `<strong style="color:#0b3b24;font-size:14px;">${escapeHtml(visit.proposedDate)}</strong>`],
    ["Preferred Time Slot", escapeHtml(visit.proposedTime || "Morning / Flexible")],
    ["Buyer Notes", escapeHtml(visit.notes || "None")],
    ["Action Needed", "<span style='color:#b45309;font-weight:600;'>Contact seller & buyer to confirm visit timing</span>"],
    ["Received Timestamp", escapeHtml(visit.createdAt)],
  ];

  const html = renderEmailLayout({
    eyebrow: "SITE VISIT REQUESTED",
    headline: `Site Visit: ${visit.buyerName} for ${visit.propertyTitle}`,
    primaryCta: propertyUrl ? { label: "View Listing on Terraland →", url: propertyUrl } : { label: "Open Admin CRM →", url: adminUrl },
    whatsappCta: waLink ? { label: "Chat on WhatsApp →", url: waLink } : undefined,
    secondaryCta: propertyUrl ? { label: "Open Admin CRM →", url: adminUrl } : undefined,
    rows,
  });

  const text = [
    `NEW SITE VISIT REQUEST:`,
    `- Buyer: ${visit.buyerName}`,
    `- Phone: ${visit.buyerPhone}`,
    `- WhatsApp: ${waLink || "N/A"}`,
    `- Email: ${visit.buyerEmail || "Not provided"}`,
    `- Property: ${visit.propertyTitle}`,
    `- Property ID: ${visit.propertyId}`,
    `- DIRECT LISTING URL: ${propertyUrl || "N/A"}`,
    `- Location: ${visit.propertyLocation}`,
    `- Proposed Date: ${visit.proposedDate}`,
    `- Proposed Time: ${visit.proposedTime || "Flexible"}`,
    `- Notes: ${visit.notes || "None"}`,
    `- CRM Link: ${adminUrl}`,
    `- Delivered to: ${recipients.join(", ")}`,
  ].join("\n");

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: recipients,
        ...(visit.buyerEmail ? { reply_to: visit.buyerEmail } : {}),
        subject: `[Site Visit Request] ${visit.buyerName} on ${visit.proposedDate} (${visit.propertyTitle})`,
        text,
        html,
      }),
    });
  } catch (error) {
    console.error("Site visit notice email failed:", error);
  }

  if (visit.buyerEmail) {
    try {
      await sendCustomerSiteVisitConfirmation(visit);
    } catch (err) {
      console.error("Customer site visit email confirmation error:", err);
    }
  }
}

export async function sendCustomerSiteVisitConfirmation(visit: SiteVisitNotice) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from || !visit.buyerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visit.buyerEmail.trim())) return;

  const siteUrl = getSiteUrl();
  const propertyUrl = visit.propertyId ? `${siteUrl}/properties/${encodeURIComponent(visit.propertyId)}` : "";
  const terralandWhatsApp = getWhatsAppLink("9494458000", `Hi Terraland, I requested a site visit for ${visit.propertyTitle} on ${visit.proposedDate}.`);

  const rows: [string, string][] = [
    ["Property", `<strong>${escapeHtml(visit.propertyTitle)}</strong>`],
    ...(propertyUrl ? [["Direct Listing Link", `<a href="${escapeHtml(propertyUrl)}" style="color:#0b3b24;font-weight:bold;text-decoration:underline;">${escapeHtml(propertyUrl)}</a>`] as [string, string]] : []),
    ["Location", escapeHtml(visit.propertyLocation)],
    ["Requested Visit Date", `<strong style="color:#0b3b24;">${escapeHtml(visit.proposedDate)}</strong>`],
    ["Preferred Time Slot", escapeHtml(visit.proposedTime || "Morning / Flexible")],
    ["Your Notes", escapeHtml(visit.notes || "None")],
    ["Status", "<span style='color:#0b3b24;font-weight:bold;'>Coordination in progress with landowner</span>"],
    ["Terraland Founder / Office", `Terraland Miyapur Real Estate<br>Founder: <a href="mailto:${PRIMARY_ADMIN_EMAIL}" style="color:#0b3b24;font-weight:600;">${PRIMARY_ADMIN_EMAIL}</a><br>WhatsApp / Call: +91 94944 58000`],
  ];

  const html = renderEmailLayout({
    eyebrow: "SITE VISIT REQUEST RECEIVED · TERRALAND",
    headline: `Site Visit Scheduled: ${visit.propertyTitle}`,
    primaryCta: propertyUrl ? { label: "View Property Details →", url: propertyUrl } : undefined,
    whatsappCta: terralandWhatsApp ? { label: "Chat on WhatsApp →", url: terralandWhatsApp } : undefined,
    rows,
  });

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [visit.buyerEmail.trim()],
        reply_to: PRIMARY_ADMIN_EMAIL,
        subject: `[Terraland] Site visit requested for ${visit.propertyTitle} (${visit.proposedDate})`,
        html,
      }),
    });
  } catch (err) {
    console.error("Customer site visit email confirmation error:", err);
  }
}
