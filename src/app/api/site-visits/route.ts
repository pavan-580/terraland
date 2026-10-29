import { NextRequest, NextResponse } from "next/server";
import { db, logMemberActivity } from "@/lib/db";
import { currentUser, newId } from "@/lib/session";
import { sendSiteVisitNotice, recordCustomerListingInterest } from "@/lib/notifications";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

async function requireAdmin() {
  const user = await currentUser();
  return user?.role === "admin" ? user : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const visits = db.prepare(`
    SELECT site_visits.*, properties.title AS propertyTitle, properties.locality, properties.city,
           properties.price, properties.area, properties.unit
    FROM site_visits
    JOIN properties ON properties.id = site_visits.propertyId
    ORDER BY site_visits.proposedDate DESC, site_visits.createdAt DESC
  `).all();

  return NextResponse.json({ visits });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(`site-visit:${ip}`, 6, 300);
  if (!rate.allowed) {
    return NextResponse.json({
      error: `Too many requests. Please wait ${rate.resetInSeconds} seconds before requesting another visit.`
    }, { status: 429 });
  }

  const user = await currentUser();
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid visit request payload." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const propertyId = typeof input.propertyId === "string" ? input.propertyId.trim() : "";
  const name = user?.name ?? (typeof input.name === "string" ? input.name.trim() : "");
  const rawPhone = typeof input.phone === "string" ? input.phone.trim().replace(/[\s()-]/g, "") : user?.phone ?? "";
  const phone = /^\d{10}$/.test(rawPhone) ? `+91${rawPhone}` : rawPhone;
  const proposedDate = typeof input.proposedDate === "string" ? input.proposedDate.trim() : "";
  const proposedTime = typeof input.proposedTime === "string" ? input.proposedTime.trim().slice(0, 50) : "Morning (10:00 AM - 1:00 PM)";
  const buyerFeedback = typeof input.notes === "string" ? input.notes.trim().slice(0, 500) : "";

  if (!propertyId) {
    return NextResponse.json({ error: "Property ID is required." }, { status: 400 });
  }
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  }
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return NextResponse.json({ error: "Please enter a valid 10-digit mobile number." }, { status: 400 });
  }
  if (!proposedDate || proposedDate.length < 8) {
    return NextResponse.json({ error: "Please select a preferred visit date." }, { status: 400 });
  }

  const property = db.prepare(`
    SELECT id, title, locality, city, owner, phone, price, area, unit
    FROM properties WHERE id = ? AND status = 'published'
  `).get(propertyId) as {
    id: string; title: string; locality: string; city: string; owner: string; phone: string; price: number; area: number; unit: string;
  } | undefined;

  if (!property) {
    return NextResponse.json({ error: "This property listing is not currently available for site visits." }, { status: 404 });
  }

  // Duplicate check: same phone + property + date within 10 minutes
  const duplicate = db.prepare(`
    SELECT id FROM site_visits
    WHERE propertyId = ? AND buyerPhone = ? AND proposedDate = ?
      AND datetime(createdAt) > datetime('now', '-10 minutes')
  `).get(property.id, phone, proposedDate);

  if (duplicate) {
    return NextResponse.json({
      success: true,
      message: "We have already received your site visit request for this date. Our founder will contact you shortly to coordinate the visit.",
      alreadyReceived: true
    }, { status: 200 });
  }

  const visitId = newId();
  const leadId = newId();
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(`
      INSERT INTO site_visits (
        id, propertyId, buyerId, buyerName, buyerPhone,
        sellerName, sellerPhone, proposedDate, proposedTime,
        confirmationStatus, buyerFeedback, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'proposed', ?, ?, ?)
    `).run(
      visitId,
      property.id,
      user?.id ?? null,
      name,
      phone,
      property.owner || "NILAY Verified Seller",
      property.phone || "",
      proposedDate,
      proposedTime,
      buyerFeedback,
      now,
      now
    );

    // Sync into unified Leads CRM
    try {
      db.prepare(`
        INSERT INTO leads (
          id, type, referenceId, name, phone, email, status, source,
          assignedPerson, notes, statusHistory, relatedPropertyIds, consentStatus, createdAt, updatedAt
        ) VALUES (?, 'buyer', ?, ?, ?, '', 'site_visit_requested', 'site_visit_modal', 'Founder', ?, ?, ?, 'consented', ?, ?)
      `).run(
        leadId,
        visitId,
        name,
        phone,
        `Site visit requested for ${property.title} on ${proposedDate} (${proposedTime}). Notes: ${buyerFeedback || "None"}`,
        JSON.stringify([{
          status: "site_visit_requested",
          changedAt: now,
          note: `Site visit requested on ${property.title} for ${proposedDate} (${proposedTime})`
        }]),
        JSON.stringify([property.id]),
        now,
        now
      );
    } catch (leadErr) {
      console.error("Lead sync error from site visit:", leadErr);
    }
  })();

  if (user) {
    logMemberActivity(user.id, "Site visit requested", `Requested site visit for ${property.title} on ${proposedDate}`);
  }

  sendSiteVisitNotice({
    id: visitId,
    buyerName: name,
    buyerPhone: phone,
    buyerEmail: user?.email || undefined,
    propertyId: property.id,
    propertyTitle: property.title,
    propertyLocation: `${property.locality}, ${property.city}`,
    propertyPrice: property.price,
    propertyArea: property.area,
    propertyUnit: property.unit,
    proposedDate,
    proposedTime,
    notes: buyerFeedback || "",
    createdAt: now
  }).catch((err) => console.error("Error dispatching site visit notification:", err));

  return NextResponse.json({
    success: true,
    message: "Your site visit request has been received. Our founder will coordinate with the seller and confirm your visit timing.",
    id: visitId
  }, { status: 201 });
}

