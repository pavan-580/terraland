import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "..", "data", "landmark.db");

const RESEND_API_KEY = process.env.RESEND_API_KEY || Buffer.from("cmVfQllmVGtNUnVfNzJkbVo2Tms2Mmp2WWZjeDNOZWlGVDZW", "base64").toString("utf8");
const FROM_EMAIL = process.env.EMAIL_FROM || "NILAY <onboarding@resend.dev>";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://nkart.store").replace(/\/+$/, "");
const PRIMARY_ADMIN_EMAIL = "pavansai580@gmail.com";

console.log(`[NILAY DAILY NURTURE] Starting runner at ${new Date().toISOString()}`);
console.log(`[NILAY DAILY NURTURE] Database: ${dbPath}`);

const db = new Database(dbPath);

try {
  // Check if customer_listing_interests exists
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='customer_listing_interests'").get();
  if (!tableCheck) {
    console.log("[NILAY DAILY NURTURE] Table customer_listing_interests not initialized yet. Exiting.");
    process.exit(0);
  }

  const activeInterests = db.prepare(`
    SELECT cli.id, cli.customerName, cli.customerEmail, cli.customerPhone,
           cli.propertyId, cli.emailCount, cli.lastEmailedAt,
           p.title AS propertyTitle, p.price AS propertyPrice, p.area AS propertyArea,
           p.unit AS propertyUnit, p.city AS propertyCity, p.locality AS propertyLocality,
           p.image AS propertyImage, p.status AS propertyStatus
    FROM customer_listing_interests cli
    LEFT JOIN properties p ON p.id = cli.propertyId
    WHERE cli.status = 'active'
      AND (cli.lastEmailedAt IS NULL OR datetime(cli.lastEmailedAt, '+24 hours') <= datetime('now'))
  `).all();

  console.log(`[NILAY DAILY NURTURE] Found ${activeInterests.length} eligible customer interest records.`);

  const markSold = db.prepare("UPDATE customer_listing_interests SET status = 'property_sold', updatedAt = CURRENT_TIMESTAMP WHERE id = ?");
  const markEmailed = db.prepare("UPDATE customer_listing_interests SET lastEmailedAt = CURRENT_TIMESTAMP, emailCount = emailCount + 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?");

  let sent = 0;
  let sold = 0;

  for (const item of activeInterests) {
    if (!item.propertyTitle || item.propertyStatus === 'sold') {
      console.log(`[NILAY DAILY NURTURE] Property ${item.propertyId} is SOLD or removed. Closing sequence for ${item.customerEmail}.`);
      markSold.run(item.id);
      sold++;
      continue;
    }

    console.log(`[NILAY DAILY NURTURE] Sending update for "${item.propertyTitle}" to ${item.customerEmail}...`);

    const propertyUrl = `${SITE_URL}/properties/${encodeURIComponent(item.propertyId)}`;
    const unsubscribeUrl = `${SITE_URL}/api/cron/daily-listing-nurture?action=unsubscribe&email=${encodeURIComponent(item.customerEmail)}&propertyId=${encodeURIComponent(item.propertyId)}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [item.customerEmail],
        reply_to: PRIMARY_ADMIN_EMAIL,
        subject: `Daily Update: ${item.propertyTitle} is still available on NILAY`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #c6dc81;border-radius:10px;">
            <h2 style="color:#0b3b24;margin-top:0;">Daily Update on ${item.propertyTitle}</h2>
            <p>Hi ${item.customerName},</p>
            <p>You recently looked into this verified property on NILAY. This listing is currently <strong>Available & Ready for Site Visit</strong>.</p>
            <ul>
              <li><strong>Location:</strong> ${item.propertyLocality}, ${item.propertyCity}</li>
              <li><strong>Size:</strong> ${item.propertyArea} ${item.propertyUnit}</li>
              <li><strong>Price:</strong> ₹${Number(item.propertyPrice).toLocaleString("en-IN")}</li>
            </ul>
            <p style="margin:20px 0;">
              <a href="${propertyUrl}" style="background:#0b3b24;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;">View Details & Schedule Visit →</a>
            </p>
            <p style="font-size:11px;color:#6b7280;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:12px;">
              You will continue receiving daily updates on this listing until it is marked as sold on NILAY.
              <a href="${unsubscribeUrl}">Unsubscribe</a>
            </p>
          </div>
        `,
      }),
    });

    if (res.ok) {
      markEmailed.run(item.id);
      sent++;
      console.log(`[NILAY DAILY NURTURE] Delivered successfully to ${item.customerEmail}`);
    } else {
      const errText = await res.text();
      console.warn(`[NILAY DAILY NURTURE] Delivery failed for ${item.customerEmail}: ${errText}`);
    }
  }

  console.log(`[NILAY DAILY NURTURE] Run finished. Delivered: ${sent}, Closed (Sold): ${sold}`);
} catch (err) {
  console.error("[NILAY DAILY NURTURE] Fatal error:", err);
} finally {
  db.close();
}

