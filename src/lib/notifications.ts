import "server-only";
import { randomUUID } from "node:crypto";
import { db, getSiteSetting } from "@/lib/db";
import { formatListingPrice, type ListingCategory, type PricePeriod } from "@/lib/market";

export const DEFAULT_RESEND_API_KEY = Buffer.from("cmVfQllmVGtNUnVfNzJkbVo2Tms2Mmp2WWZjeDNOZWlGVDZW", "base64").toString("utf8");
export const PRIMARY_ADMIN_EMAIL = "pavansai580@gmail.com";
export const RESEND_OWNER_EMAIL = "salemraju705@gmail.com";

export function getEmailConfig() {
  const dbKey = getSiteSetting("resendApiKey");
  const apiKey = (dbKey && dbKey.trim().length > 0 ? dbKey.trim() : "") || process.env.RESEND_API_KEY || DEFAULT_RESEND_API_KEY;
  const from = getSiteSetting("emailFrom") || process.env.EMAIL_FROM || "NILAY <onboarding@resend.dev>";
  const adminEmail = getSiteSetting("adminNotificationEmail") || process.env.ADMIN_EMAIL || PRIMARY_ADMIN_EMAIL;
  return { apiKey, from, adminEmail };
}

export function getAdminRecipients(): string[] {
  const envAdmin = (getSiteSetting("adminNotificationEmail") || process.env.ADMIN_EMAIL || PRIMARY_ADMIN_EMAIL).trim().toLowerCase();
  const set = new Set<string>([PRIMARY_ADMIN_EMAIL, RESEND_OWNER_EMAIL]);
  if (envAdmin && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(envAdmin)) {
    set.add(envAdmin);
  }
  return Array.from(set);
}

export function getSiteUrl(): string {
  const saved = getSiteSetting("siteBaseUrl")?.trim();
  if (saved) return saved.replace(/\/+$/, "");
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.APP_BASE_URL?.trim() || process.env.RENDER_EXTERNAL_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, "");
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
  eyebrow = "NILAY NOTIFICATION",
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
            NILAY Real Estate · Miyapur, Hyderabad<br>
            Direct lead notification dispatched to Founder: <a href="mailto:${PRIMARY_ADMIN_EMAIL}" style="color:#0b3b24;font-weight:600;text-decoration:none;">${PRIMARY_ADMIN_EMAIL}</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `.trim();
}

function renderUserWelcomeEmail(name: string, siteUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:20px 10px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 3px 12px rgba(0,0,0,0.05);">
        <div style="background:#0b3b24;background-image:linear-gradient(135deg,#0b3b24,#155d39);padding:26px 28px;color:#ffffff;text-align:center;">
          <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c6dc81;font-weight:700;margin-bottom:6px;">WELCOME TO NILAY</div>
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">Welcome, ${escapeHtml(name)}!</h1>
        </div>
        <div style="padding:28px 28px 24px;color:#1f2937;font-size:14px;line-height:1.6;">
          <p style="margin-top:0;">Your NILAY Real Estate member account is ready. With your account, you can:</p>
          <ul style="padding-left:20px;color:#374151;margin-bottom:24px;">
            <li style="margin-bottom:8px;"><strong>Browse verified plots:</strong> Explore clear-title open plots, residential layouts, farm houses, and resorts across Hyderabad & Telangana.</li>
            <li style="margin-bottom:8px;"><strong>List your land for free:</strong> Reach genuine buyers and manage your properties directly from your profile.</li>
            <li style="margin-bottom:8px;"><strong>Track buyer inquiries:</strong> Get direct lead alerts and connect with verified buyers.</li>
          </ul>
          <div style="text-align:center;margin:30px 0 24px;">
            <a href="${escapeHtml(siteUrl)}/search" style="display:inline-block;background:#0b3b24;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;margin-right:10px;margin-bottom:10px;">Explore Verified Plots</a>
            <a href="${escapeHtml(siteUrl)}/sell" style="display:inline-block;background:#155d39;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;margin-bottom:10px;">List Land for Free</a>
          </div>
          <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;text-align:center;">
            NILAY Real Estate · Hyderabad, Telangana<br>
            Questions? Contact customer care: <a href="mailto:care@nilay.in" style="color:#0b3b24;text-decoration:none;font-weight:600;">care@nilay.in</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `.trim();
}


export async function dispatchEmailToRecipients(
  recipients: string[],
  payload: { from: string; subject: string; text?: string; html: string; reply_to?: string },
  apiKey: string
): Promise<{ delivered: string[]; failed: { email: string; error: string }[] }> {
  const delivered: string[] = [];
  const failed: { email: string; error: string }[] = [];

  for (const email of recipients) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: payload.from,
          to: [email],
          reply_to: payload.reply_to,
          subject: payload.subject,
          text: payload.text,
          html: payload.html,
        }),
      });

      if (response.ok) {
        delivered.push(email);
      } else {
        const detail = await response.text();
        failed.push({ email, error: detail });
        console.warn(`Resend email delivery notice for ${email}:`, detail);
      }
    } catch (err) {
      failed.push({ email, error: String(err) });
      console.warn(`Resend network error for ${email}:`, err);
    }
  }

  return { delivered, failed };
}

export async function sendTestEmail(targetEmail?: string) {
  const { apiKey, from } = getEmailConfig();
  if (!apiKey) {
    throw new Error("Resend API key is not configured.");
  }

  const primaryTarget = targetEmail || PRIMARY_ADMIN_EMAIL;
  const targets = Array.from(new Set([primaryTarget, RESEND_OWNER_EMAIL]));
  const results: Array<{ to: string; success: boolean; id?: string; error?: string }> = [];

  for (const to of targets) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [to],
          subject: `NILAY Test Email · ${new Date().toLocaleTimeString("en-IN")}`,
          text: `Hello,\n\nThis is a test email confirming your NILAY email notification delivery is working properly.\n\nSent from: ${from}\nDelivered to: ${to}`,
          html: `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #c6dc81;border-radius:8px;background:#f9fdfa;">
            <h2 style="color:#0b3b24;margin-top:0;">✅ NILAY Email Delivery Verified!</h2>
            <p style="color:#274332;font-size:14px;line-height:1.5;">This test confirms that your Resend API key and sender configuration are operational.</p>
            <div style="background:#ffffff;padding:12px 16px;border-radius:6px;border:1px solid #e2ece3;font-size:13px;color:#1e3326;margin:16px 0;">
              <div><strong>Sender (From):</strong> ${escapeHtml(from)}</div>
              <div><strong>Recipient (To):</strong> ${escapeHtml(to)}</div>
              <div><strong>Timestamp:</strong> ${escapeHtml(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))}</div>
            </div>
            <p style="color:#52735d;font-size:12px;margin-bottom:0;">NILAY Real Estate · Notification System</p>
          </div>`,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        results.push({ to, success: true, id: json.id });
      } else {
        const detail = await response.text();
        results.push({ to, success: false, error: detail });
      }
    } catch (err) {
      results.push({ to, success: false, error: String(err) });
    }
  }

  const anySuccess = results.some((r) => r.success);
  if (!anySuccess) {
    throw new Error(`Resend API error: ${results.map((r) => `${r.to}: ${r.error}`).join("; ")}`);
  }

  return { success: true, from, results };
}

export async function sendPasswordResetCode(email: string, code: string) {
  const { apiKey, from } = getEmailConfig();
  if (!apiKey || !from) {
    console.log(`\n======================================================`);
    console.log(`🔑 [NILAY PASSWORD RESET CODE]`);
    console.log(`Recipient: ${email}`);
    console.log(`Verification Code: ${code}`);
    console.log(`Expires in: 10 minutes`);
    console.log(`(Configure Resend API key in Admin Settings to send real emails)`);
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
  const { apiKey, from } = getEmailConfig();
  if (!apiKey || !from) {
    throw new Error("Registration email is not configured. Set your Resend API Key in Admin Settings.");
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
    headline: `New NILAY Member: ${name}`,
    primaryCta: { label: "Open Admin Dashboard →", url: crmUrl },
    rows,
  });

  const text = `New NILAY account registered:\n\nName: ${name}\nEmail: ${email}\nAdmin CRM: ${crmUrl}\nDelivered to: ${recipients.join(", ")}`;

  // 1. Send notice to Admin recipients with per-recipient resilience
  await dispatchEmailToRecipients(
    recipients,
    { from, subject: `New NILAY Member: ${name} (${email})`, text, html },
    apiKey
  );

  // 2. Also send Welcome email to the newly registered Member
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.endsWith("@phone.nilay.invalid")) {
    try {
      const welcomeHtml = renderUserWelcomeEmail(name, siteUrl);
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [email],
          subject: `Welcome to NILAY Real Estate, ${name}!`,
          text: `Hi ${name},\n\nWelcome to NILAY Real Estate. Your account has been created successfully.\n\nBrowse verified plots: ${siteUrl}/search\nList your land for free: ${siteUrl}/sell\n\nBest regards,\nThe NILAY Team`,
          html: welcomeHtml,
        }),
      });
    } catch (userErr) {
      console.warn("Failed to deliver user welcome email:", userErr);
    }
  }
}

export async function sendLenderInterestNotice(lead: { name: string; email: string; phone: string; amount: number; message: string; createdAt: string }) {
  const { apiKey, from } = getEmailConfig();
  if (!apiKey || !from) throw new Error("Lender interest email is not configured. Add Resend key in Admin.");

  const amountStr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(lead.amount);
  const siteUrl = getSiteUrl();
  const crmUrl = `${siteUrl}/admin`;
  const waLink = getWhatsAppLink(lead.phone, `Hi ${lead.name}, regarding your lender financing inquiry on NILAY...`);
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

  const text = `New Lender Interest Registered on NILAY\n\nName: ${lead.name}\nPhone: ${lead.phone}\nEmail: ${lead.email}\nAmount: ${amountStr}\nDetails: ${lead.message}\nReceived: ${lead.createdAt}\nCRM: ${crmUrl}`;

  await dispatchEmailToRecipients(
    recipients,
    {
      from,
      reply_to: lead.email,
      subject: `New Lender Interest: ${lead.name} (${amountStr})`,
      text,
      html,
    },
    apiKey
  );
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
  const { apiKey, from } = getEmailConfig();
  if (!apiKey || !from) {
    throw new Error("Enquiry email is not configured. Configure Resend API Key in Admin Settings.");
  }

  const siteUrl = getSiteUrl();
  const propertyUrl = `${siteUrl}/properties/${encodeURIComponent(inquiry.propertyId)}`;
  const adminUrl = `${siteUrl}/admin`;
  const price = formatListingPrice({ price: inquiry.price, listingCategory: inquiry.listingCategory, pricePeriod: inquiry.pricePeriod });
  const categoryLabel = inquiry.listingCategory === "rent" ? "Rental" : "Residential Plot";
  const waLink = getWhatsAppLink(inquiry.phone, `Hi ${inquiry.name}, regarding your enquiry on NILAY for ${inquiry.propertyTitle}...`);
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
    primaryCta: { label: "View Listing on NILAY →", url: propertyUrl },
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

  await dispatchEmailToRecipients(
    recipients,
    {
      from,
      subject: `[NILAY Enquiry] ${inquiry.name} on ${inquiry.propertyTitle}`,
      text: textRows,
      html,
      ...(inquiry.email ? { reply_to: inquiry.email } : {}),
    },
    apiKey
  );

  // Automatically record this buyer's interest for daily nurture updates
  if (inquiry.email) {
    recordCustomerListingInterest({
      customerEmail: inquiry.email,
      customerName: inquiry.name,
      customerPhone: inquiry.phone,
      propertyId: inquiry.propertyId,
      source: "inquiry",
    });
  }

  // Also dispatch enquiry confirmation email to the customer based on their details
  try {
    await sendCustomerInquiryConfirmation(inquiry);
  } catch (customerEmailErr) {
    console.error("Failed to send enquiry confirmation to customer:", customerEmailErr);
  }
}

export async function sendCustomerInquiryConfirmation(inquiry: InquiryNotice) {
  const { apiKey, from } = getEmailConfig();
  if (!apiKey || !from) {
    return;
  }
  if (!inquiry.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email.trim())) {
    return;
  }

  const siteUrl = getSiteUrl();
  const propertyUrl = `${siteUrl}/properties/${encodeURIComponent(inquiry.propertyId)}`;
  const price = formatListingPrice({ price: inquiry.price, listingCategory: inquiry.listingCategory, pricePeriod: inquiry.pricePeriod });
  const nilayWhatsApp = getWhatsAppLink("9494458000", `Hi NILAY, I submitted an enquiry for ${inquiry.propertyTitle} (ID: ${inquiry.propertyId}).`);

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
    ["NILAY Founder / Office", `NILAY Miyapur Real Estate<br>Founder: <a href="mailto:${PRIMARY_ADMIN_EMAIL}" style="color:#0b3b24;font-weight:600;">${PRIMARY_ADMIN_EMAIL}</a><br>Verified Direct Real Estate Advisory`],
  ];

  const html = renderEmailLayout({
    eyebrow: "ENQUIRY CONFIRMATION · NILAY",
    headline: `We received your enquiry for ${inquiry.propertyTitle}`,
    primaryCta: { label: "View Property on NILAY →", url: propertyUrl },
    whatsappCta: nilayWhatsApp ? { label: "Chat on WhatsApp →", url: nilayWhatsApp } : undefined,
    rows,
  });

  const textRows = [
    `Dear ${inquiry.name},`,
    ``,
    `Thank you for contacting NILAY regarding "${inquiry.propertyTitle}".`,
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
    `NILAY ADVISORY & SUPPORT:`,
    `- Founder: ${PRIMARY_ADMIN_EMAIL}`,
    `- Office: Miyapur, Hyderabad, Telangana`,
    `- WhatsApp: https://wa.me/919494458000`,
    ``,
    `Warm regards,`,
    `The NILAY Real Estate Team`,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [inquiry.email.trim()],
        reply_to: PRIMARY_ADMIN_EMAIL,
        subject: `[NILAY Confirmation] Enquiry received for ${inquiry.propertyTitle}`,
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
  const { apiKey, from } = getEmailConfig();
  if (!apiKey || !from) return;

  const siteUrl = getSiteUrl();
  const crmUrl = `${siteUrl}/admin`;
  const waLink = getWhatsAppLink(req.phone, `Hi ${req.name}, regarding your plot requirement in ${req.preferredLocation} on NILAY...`);
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
    await dispatchEmailToRecipients(
      recipients,
      {
        from,
        subject: `[NILAY Match] New Buyer: ${req.name} for ${req.preferredLocation} (${budgetStr})`,
        text,
        html,
        ...(req.email ? { reply_to: req.email } : {}),
      },
      apiKey
    );
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
  const { apiKey, from } = getEmailConfig();
  if (!apiKey || !from || !req.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.email.trim())) return;

  const siteUrl = getSiteUrl();
  const nilayWhatsApp = getWhatsAppLink("9494458000", `Hi NILAY, I registered a plot requirement for ${req.preferredLocation}.`);
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
    ["NILAY Founder / Office", `NILAY Miyapur Real Estate<br>Founder: <a href="mailto:${PRIMARY_ADMIN_EMAIL}" style="color:#0b3b24;font-weight:600;">${PRIMARY_ADMIN_EMAIL}</a><br>Verified Direct Real Estate Advisory`],
  ];

  const html = renderEmailLayout({
    eyebrow: "REQUIREMENT RECORDED · NILAY",
    headline: `We're finding matching plots for you in ${req.preferredLocation}`,
    primaryCta: { label: "Explore Current Listings →", url: `${siteUrl}/search?category=sale` },
    whatsappCta: nilayWhatsApp ? { label: "Chat on WhatsApp →", url: nilayWhatsApp } : undefined,
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
        subject: `[NILAY] We received your plot requirement in ${req.preferredLocation}`,
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
  const { apiKey, from } = getEmailConfig();
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
    primaryCta: propertyUrl ? { label: "View Listing on NILAY →", url: propertyUrl } : { label: "Open Admin CRM →", url: adminUrl },
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
    await dispatchEmailToRecipients(
      recipients,
      {
        from,
        subject: `[Site Visit Request] ${visit.buyerName} on ${visit.proposedDate} (${visit.propertyTitle})`,
        text,
        html,
        ...(visit.buyerEmail ? { reply_to: visit.buyerEmail } : {}),
      },
      apiKey
    );
  } catch (error) {
    console.error("Site visit notice email failed:", error);
  }

  // Automatically record site visitor's interest for daily nurture updates
  if (visit.buyerEmail) {
    recordCustomerListingInterest({
      customerEmail: visit.buyerEmail,
      customerName: visit.buyerName,
      customerPhone: visit.buyerPhone,
      propertyId: visit.propertyId,
      source: "site_visit",
    });
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
  const { apiKey, from } = getEmailConfig();
  if (!apiKey || !from || !visit.buyerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visit.buyerEmail.trim())) return;

  const siteUrl = getSiteUrl();
  const propertyUrl = visit.propertyId ? `${siteUrl}/properties/${encodeURIComponent(visit.propertyId)}` : "";
  const nilayWhatsApp = getWhatsAppLink("9494458000", `Hi NILAY, I requested a site visit for ${visit.propertyTitle} on ${visit.proposedDate}.`);

  const rows: [string, string][] = [
    ["Property", `<strong>${escapeHtml(visit.propertyTitle)}</strong>`],
    ...(propertyUrl ? [["Direct Listing Link", `<a href="${escapeHtml(propertyUrl)}" style="color:#0b3b24;font-weight:bold;text-decoration:underline;">${escapeHtml(propertyUrl)}</a>`] as [string, string]] : []),
    ["Location", escapeHtml(visit.propertyLocation)],
    ["Requested Visit Date", `<strong style="color:#0b3b24;">${escapeHtml(visit.proposedDate)}</strong>`],
    ["Preferred Time Slot", escapeHtml(visit.proposedTime || "Morning / Flexible")],
    ["Your Notes", escapeHtml(visit.notes || "None")],
    ["Status", "<span style='color:#0b3b24;font-weight:bold;'>Coordination in progress with landowner</span>"],
    ["NILAY Founder / Office", `NILAY Miyapur Real Estate<br>Founder: <a href="mailto:${PRIMARY_ADMIN_EMAIL}" style="color:#0b3b24;font-weight:600;">${PRIMARY_ADMIN_EMAIL}</a><br>Verified Direct Real Estate Advisory`],
  ];

  const html = renderEmailLayout({
    eyebrow: "SITE VISIT REQUEST RECEIVED · NILAY",
    headline: `Site Visit Scheduled: ${visit.propertyTitle}`,
    primaryCta: propertyUrl ? { label: "View Property Details →", url: propertyUrl } : undefined,
    whatsappCta: nilayWhatsApp ? { label: "Chat on WhatsApp →", url: nilayWhatsApp } : undefined,
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
        subject: `[NILAY] Site visit requested for ${visit.propertyTitle} (${visit.proposedDate})`,
        html,
      }),
    });
  } catch (err) {
    console.error("Customer site visit email confirmation error:", err);
  }
}

export async function sendListingSubmissionNotice(property: {
  id: string;
  title: string;
  owner: string;
  phone: string;
  price: number;
  locality: string;
  city: string;
  area: number | string;
  unit: string;
  listingCategory?: string;
  type?: string;
}) {
  const { apiKey, from } = getEmailConfig();
  if (!apiKey || !from) return;

  const siteUrl = getSiteUrl();
  const adminUrl = `${siteUrl}/admin`;
  const recipients = getAdminRecipients();
  const categoryLabel = property.listingCategory === "rent" ? "Rental" : "Plot For Sale";
  const formattedPrice = formatListingPrice({ price: property.price, listingCategory: (property.listingCategory ?? "sale") as ListingCategory, pricePeriod: "total" as PricePeriod });

  const rows: [string, string][] = [
    ["Listing Title", `<strong>${escapeHtml(property.title)}</strong>`],
    ["Listing ID", `<code>${escapeHtml(property.id)}</code>`],
    ["Category / Type", escapeHtml(`${categoryLabel} · ${property.type || "Plot"}`)],
    ["Location", escapeHtml(`${property.locality}, ${property.city}`)],
    ["Land Area", escapeHtml(`${property.area} ${property.unit}`)],
    ["Price", `<strong style="color:#0b3b24;">${escapeHtml(formattedPrice)}</strong>`],
    ["Owner Name", escapeHtml(property.owner)],
    ["Owner Phone", `<a href="tel:${escapeHtml(property.phone)}" style="color:#0b3b24;font-weight:600;">${escapeHtml(property.phone)}</a>`],
    ["Approval Status", "<strong style='color:#b45309;'>Awaiting Admin Review & Approval</strong>"],
  ];

  const html = renderEmailLayout({
    eyebrow: "NEW LISTING SUBMITTED · ACTION REQUIRED",
    headline: `New Listing: ${property.title} by ${property.owner}`,
    primaryCta: { label: "Review & Approve in Admin →", url: adminUrl },
    rows,
  });

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: `[New Listing Submitted] ${property.title} - Awaiting Approval`,
        html,
      }),
    });
  } catch (err) {
    console.error("Listing submission notification error:", err);
  }
}

export async function sendListingEditNotice(property: {
  id: string;
  title: string;
  owner: string;
  changedFields: string[];
}) {
  const { apiKey, from } = getEmailConfig();
  if (!apiKey || !from) return;

  const siteUrl = getSiteUrl();
  const adminUrl = `${siteUrl}/admin`;
  const recipients = getAdminRecipients();

  const rows: [string, string][] = [
    ["Listing Title", `<strong>${escapeHtml(property.title)}</strong>`],
    ["Listing ID", `<code>${escapeHtml(property.id)}</code>`],
    ["Seller / Member", escapeHtml(property.owner)],
    ["Modified Fields", escapeHtml(property.changedFields.join(", "))],
    ["Status", "<strong style='color:#b45309;'>Updates Submitted · Awaiting Admin Approval</strong>"],
  ];

  const html = renderEmailLayout({
    eyebrow: "LISTING EDIT SUBMITTED · ACTION REQUIRED",
    headline: `Listing Updated: ${property.title}`,
    primaryCta: { label: "Review in Admin Dashboard →", url: adminUrl },
    rows,
  });

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: `[Listing Edit Awaiting Approval] ${property.title}`,
        html,
      }),
    });
  } catch (err) {
    console.error("Listing edit notification error:", err);
  }
}

export async function sendListingDeletionNotice(property: {
  id: string;
  title: string;
  owner: string;
}) {
  const { apiKey, from } = getEmailConfig();
  if (!apiKey || !from) return;

  const siteUrl = getSiteUrl();
  const adminUrl = `${siteUrl}/admin`;
  const recipients = getAdminRecipients();

  const rows: [string, string][] = [
    ["Listing Title", `<strong>${escapeHtml(property.title)}</strong>`],
    ["Listing ID", `<code>${escapeHtml(property.id)}</code>`],
    ["Seller / Member", escapeHtml(property.owner)],
    ["Request", "<strong style='color:#dc2626;'>Seller requested listing removal · Awaiting your approval</strong>"],
  ];

  const html = renderEmailLayout({
    eyebrow: "LISTING DELETION REQUESTED",
    headline: `Deletion Request: ${property.title}`,
    primaryCta: { label: "Review in Admin Dashboard →", url: adminUrl },
    rows,
  });

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: `[Listing Deletion Requested] ${property.title}`,
        html,
      }),
    });
  } catch (err) {
    console.error("Listing deletion notification error:", err);
  }
}

export async function sendReviewSubmissionNotice(review: {
  propertyId: string;
  propertyTitle: string;
  reviewerName: string;
  rating: number;
  comment: string;
}) {
  const { apiKey, from } = getEmailConfig();
  if (!apiKey || !from) return;

  const siteUrl = getSiteUrl();
  const propUrl = `${siteUrl}/properties/${encodeURIComponent(review.propertyId)}`;
  const recipients = getAdminRecipients();

  const rows: [string, string][] = [
    ["Property", `<strong>${escapeHtml(review.propertyTitle)}</strong>`],
    ["Reviewer", escapeHtml(review.reviewerName)],
    ["Rating", `<strong>${"⭐".repeat(review.rating)} (${review.rating} / 5)</strong>`],
    ["Review Comment", escapeHtml(review.comment)],
  ];

  const html = renderEmailLayout({
    eyebrow: "NEW REVIEW SUBMITTED",
    headline: `New Review on ${review.propertyTitle}`,
    primaryCta: { label: "View Property Reviews →", url: propUrl },
    rows,
  });

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: `[New Review] ${review.reviewerName} rated ${review.propertyTitle} (${review.rating}/5)`,
        html,
      }),
    });
  } catch (err) {
    console.error("Review notification error:", err);
  }
}


export function recordCustomerListingInterest({
  customerEmail,
  customerName,
  customerPhone,
  propertyId,
  userId,
  source,
}: {
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  propertyId: string;
  userId?: string;
  source: "inquiry" | "site_visit" | "favorite" | "view" | "signup";
}) {
  if (!customerEmail || !/^[^s@]+@[^s@]+.[^s@]+$/.test(customerEmail.trim()) || customerEmail.endsWith("@phone.nilay.invalid")) {
    return;
  }
  try {
    const cleanEmail = customerEmail.trim().toLowerCase();
    const cleanName = (customerName || "Valued Member").trim();
    const cleanPhone = (customerPhone || "").trim();
    const id = `cli_${randomUUID()}`;

    db.prepare(`
      INSERT INTO customer_listing_interests (id, userId, customerName, customerEmail, customerPhone, propertyId, source, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(customerEmail, propertyId) DO UPDATE SET
        customerName = CASE WHEN excluded.customerName != 'Valued Member' THEN excluded.customerName ELSE customer_listing_interests.customerName END,
        customerPhone = CASE WHEN excluded.customerPhone != '' THEN excluded.customerPhone ELSE customer_listing_interests.customerPhone END,
        source = excluded.source,
        status = CASE WHEN customer_listing_interests.status = 'unsubscribed' THEN 'unsubscribed' ELSE 'active' END,
        updatedAt = CURRENT_TIMESTAMP
    `).run(id, userId ?? null, cleanName, cleanEmail, cleanPhone, propertyId, source);
  } catch (err) {
    console.warn("Failed to record customer listing interest:", err);
  }
}

export function unsubscribeCustomerListingInterest(customerEmail: string, propertyId?: string) {
  try {
    const cleanEmail = customerEmail.trim().toLowerCase();
    if (propertyId) {
      db.prepare("UPDATE customer_listing_interests SET status = 'unsubscribed', updatedAt = CURRENT_TIMESTAMP WHERE customerEmail = ? AND propertyId = ?").run(cleanEmail, propertyId);
    } else {
      db.prepare("UPDATE customer_listing_interests SET status = 'unsubscribed', updatedAt = CURRENT_TIMESTAMP WHERE customerEmail = ?").run(cleanEmail);
    }
    return true;
  } catch {
    return false;
  }
}

export function renderDailyListingNurtureEmail({
  customerName,
  customerEmail,
  propertyId,
  propertyTitle,
  propertyPrice,
  propertyArea,
  propertyUnit,
  propertyCity,
  propertyLocality,
  propertyImage,
  listingCategory,
  pricePeriod,
  siteUrl,
}: {
  customerName: string;
  customerEmail: string;
  propertyId: string;
  propertyTitle: string;
  propertyPrice: number;
  propertyArea: number;
  propertyUnit: string;
  propertyCity: string;
  propertyLocality: string;
  propertyImage?: string;
  listingCategory?: string;
  pricePeriod?: string;
  siteUrl: string;
}): string {
  const propertyUrl = `${siteUrl}/properties/${encodeURIComponent(propertyId)}`;
  const unsubscribeUrl = `${siteUrl}/api/cron/daily-listing-nurture?action=unsubscribe&email=${encodeURIComponent(customerEmail)}&propertyId=${encodeURIComponent(propertyId)}`;
  const formattedPrice = formatListingPrice({
    price: propertyPrice,
    listingCategory: (listingCategory ?? "sale") as ListingCategory,
    pricePeriod: (pricePeriod ?? "total") as PricePeriod,
  });

  const nilayWhatsApp = getWhatsAppLink("9494458000", `Hi NILAY, I have an update inquiry regarding ${propertyTitle} (ID: ${propertyId}).`);

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:20px 10px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,0.06);border:1px solid #e5e7eb;">
        <div style="background:#0b3b24;background-image:linear-gradient(135deg,#0b3b24,#155d39);padding:24px 26px;color:#ffffff;">
          <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#c6dc81;font-weight:700;margin-bottom:6px;">
            NILAY DAILY LISTING UPDATE
          </div>
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">
            Daily Status: ${escapeHtml(propertyTitle)}
          </h1>
        </div>
        <div style="padding:22px 26px;color:#1f2937;font-size:14px;line-height:1.6;">
          <p style="margin-top:0;">
            Hello <strong>${escapeHtml(customerName)}</strong>,
          </p>
          <p>
            You recently reviewed or enquired about this property on NILAY. Here is today's verified status update:
          </p>
          ${propertyImage ? `<div style="margin:16px 0;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;max-height:220px;"><img src="${escapeHtml(propertyImage)}" alt="${escapeHtml(propertyTitle)}" style="width:100%;height:200px;object-fit:cover;display:block;" /></div>` : ""}
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:18px 0;">
            <tr>
              <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;width:36%;font-size:13px;background:#f9fafb;">Availability Status</td>
              <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#0b3b24;font-size:13px;font-weight:700;">🟢 Active &amp; Available for Site Visit</td>
            </tr>
            <tr>
              <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;font-size:13px;background:#f9fafb;">Location</td>
              <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:13px;">${escapeHtml(propertyLocality)}, ${escapeHtml(propertyCity)}</td>
            </tr>
            <tr>
              <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;font-size:13px;background:#f9fafb;">Land / Plot Size</td>
              <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:13px;">${escapeHtml(String(propertyArea))} ${escapeHtml(propertyUnit)}</td>
            </tr>
            <tr>
              <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;font-size:13px;background:#f9fafb;">Asking Price</td>
              <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#0b3b24;font-size:14px;font-weight:700;">${escapeHtml(formattedPrice)}</td>
            </tr>
            <tr>
              <td style="padding:9px 12px;font-weight:600;color:#374151;font-size:13px;background:#f9fafb;">Legal Verification</td>
              <td style="padding:9px 12px;color:#111827;font-size:13px;">Physical Site Check &amp; Title Verified</td>
            </tr>
          </table>

          <div style="margin:24px 0 16px;text-align:center;">
            <a href="${escapeHtml(propertyUrl)}" style="display:inline-block;background:#0b3b24;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;margin-right:8px;margin-bottom:8px;">View Full Listing on NILAY →</a>
            ${nilayWhatsApp ? `<a href="${escapeHtml(nilayWhatsApp)}" style="display:inline-block;background:#25D366;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;margin-bottom:8px;">Chat with Founder on WhatsApp →</a>` : ""}
          </div>

          <p style="font-size:12px;color:#6b7280;line-height:1.5;margin-top:20px;padding-top:14px;border-top:1px solid #e5e7eb;">
            You will continue receiving daily updates regarding this listing until the property is marked as <strong>SOLD</strong> on NILAY.
          </p>

          <div style="margin-top:14px;font-size:11px;color:#9ca3af;text-align:center;">
            NILAY Real Estate · Miyapur, Hyderabad<br>
            Direct Founder line: <a href="mailto:${PRIMARY_ADMIN_EMAIL}" style="color:#0b3b24;text-decoration:none;">${PRIMARY_ADMIN_EMAIL}</a><br>
            <a href="${escapeHtml(unsubscribeUrl)}" style="color:#9ca3af;text-decoration:underline;margin-top:6px;display:inline-block;">Unsubscribe from updates for this listing</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `.trim();
}

export async function dispatchDailyListingNurtureEmails(): Promise<{
  processed: number;
  delivered: number;
  soldClosed: number;
  failed: number;
  errors: string[];
}> {
  const { apiKey, from } = getEmailConfig();
  if (!apiKey || !from) {
    throw new Error("Email service is not configured with Resend API key.");
  }

  const siteUrl = getSiteUrl();

  const activeInterests = db.prepare(`
    SELECT cli.id, cli.userId, cli.customerName, cli.customerEmail, cli.customerPhone,
           cli.propertyId, cli.emailCount, cli.lastEmailedAt,
           p.title AS propertyTitle, p.price AS propertyPrice, p.area AS propertyArea,
           p.unit AS propertyUnit, p.city AS propertyCity, p.locality AS propertyLocality,
           p.image AS propertyImage, p.status AS propertyStatus,
           p.listingCategory, p.pricePeriod
    FROM customer_listing_interests cli
    LEFT JOIN properties p ON p.id = cli.propertyId
    WHERE cli.status = 'active'
      AND (cli.lastEmailedAt IS NULL OR datetime(cli.lastEmailedAt, '+24 hours') <= datetime('now'))
    ORDER BY cli.createdAt ASC
  `).all() as Array<{
    id: string;
    userId?: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    propertyId: string;
    emailCount: number;
    lastEmailedAt: string | null;
    propertyTitle: string | null;
    propertyPrice: number | null;
    propertyArea: number | null;
    propertyUnit: string | null;
    propertyCity: string | null;
    propertyLocality: string | null;
    propertyImage: string | null;
    propertyStatus: string | null;
    listingCategory?: string;
    pricePeriod?: string;
  }>;

  let delivered = 0;
  let soldClosed = 0;
  let failed = 0;
  const errors: string[] = [];

  const markSold = db.prepare("UPDATE customer_listing_interests SET status = 'property_sold', updatedAt = CURRENT_TIMESTAMP WHERE id = ?");
  const markEmailed = db.prepare("UPDATE customer_listing_interests SET lastEmailedAt = CURRENT_TIMESTAMP, emailCount = emailCount + 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?");

  for (const item of activeInterests) {
    if (!item.propertyTitle || item.propertyStatus === 'sold') {
      markSold.run(item.id);
      soldClosed += 1;
      continue;
    }

    try {
      const html = renderDailyListingNurtureEmail({
        customerName: item.customerName,
        customerEmail: item.customerEmail,
        propertyId: item.propertyId,
        propertyTitle: item.propertyTitle,
        propertyPrice: item.propertyPrice ?? 0,
        propertyArea: item.propertyArea ?? 0,
        propertyUnit: item.propertyUnit ?? "Sq. Yd",
        propertyCity: item.propertyCity ?? "Hyderabad",
        propertyLocality: item.propertyLocality ?? "Miyapur",
        propertyImage: item.propertyImage ?? "",
        listingCategory: item.listingCategory,
        pricePeriod: item.pricePeriod,
        siteUrl,
      });

      const subject = `Update on ${item.propertyTitle} · NILAY Verified Listing`;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [item.customerEmail],
          reply_to: PRIMARY_ADMIN_EMAIL,
          subject,
          html,
        }),
      });

      if (response.ok) {
        markEmailed.run(item.id);
        delivered += 1;
      } else {
        const errDetail = await response.text();
        failed += 1;
        errors.push(`${item.customerEmail}: ${errDetail}`);
        console.warn(`Daily nurture email notice for ${item.customerEmail}:`, errDetail);
      }
    } catch (err) {
      failed += 1;
      const msg = String(err);
      errors.push(`${item.customerEmail}: ${msg}`);
      console.warn(`Daily nurture dispatch error for ${item.customerEmail}:`, err);
    }
  }

  return {
    processed: activeInterests.length,
    delivered,
    soldClosed,
    failed,
    errors,
  };
}
