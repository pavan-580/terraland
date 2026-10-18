import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db, logGuestActivity, logMemberActivity } from "@/lib/db";
import { currentUser, newId } from "@/lib/session";
import { deliverPendingInquiryNotices } from "@/lib/notifications";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(`inquiry:${ip}`, 10, 300);
  if (!rate.allowed) {
    return NextResponse.json({
      error: `Too many requests. Please wait ${rate.resetInSeconds} seconds before trying again.`
    }, { status: 429 });
  }

  const user = await currentUser();
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Please send a valid enquiry." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const propertyId = typeof input.propertyId === "string" ? input.propertyId.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  const name = user?.name ?? (typeof input.name === "string" ? input.name.trim() : "");
  const email = user?.email || (typeof input.email === "string" ? input.email.trim().toLowerCase() : "");
  const rawPhone = typeof input.phone === "string" ? input.phone.trim().replace(/[\s()-]/g, "") : user?.phone ?? "";
  const phone = /^\d{10}$/.test(rawPhone) ? `+91${rawPhone}` : rawPhone;
  const contactMethod = ["phone", "whatsapp", "email"].includes(String(input.contactMethod)) ? String(input.contactMethod) : "phone";
  const preferredTimeline = typeof input.preferredTimeline === "string" ? input.preferredTimeline.trim().slice(0, 80) : "";
  const fundingReadiness = typeof input.fundingReadiness === "string" ? input.fundingReadiness.trim().slice(0, 80) : "";
  const source = typeof input.source === "string" ? input.source.trim().slice(0, 60) : "website_listing";

  if (!propertyId || propertyId.length > 100 || message.length > 1000 ||
    name.length < 2 || name.length > 80 || (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    !/^\+[1-9]\d{7,14}$/.test(phone)) {
    return NextResponse.json({ error: "Please check your name, phone number, and enquiry details and try again." }, { status: 400 });
  }

  if (user && phone !== user.phone) {
    db.prepare("UPDATE users SET phone = ? WHERE id = ?").run(phone, user.id);
    logMemberActivity(user.id, "Profile updated", "Added or updated phone number.");
  }

  const property = db.prepare(`
    SELECT id, title, type, listingCategory, pricePeriod, city, locality, price, area, unit, address, mapUrl
    FROM properties WHERE id = ? AND status = 'published'
  `).get(propertyId) as {
    id: string; title: string; type: string; listingCategory: string; pricePeriod: string; city: string; locality: string; price: number;
    area: number; unit: string; address: string; mapUrl: string;
  } | undefined;
  if (!property) return NextResponse.json({ error: "This listing is no longer available." }, { status: 404 });

  // Duplicate submission prevention: check if same phone submitted for same property within last 2 minutes
  const duplicate = db.prepare(`
    SELECT id FROM inquiries
    WHERE propertyId = ? AND phone = ? AND datetime(createdAt) > datetime('now', '-2 minutes')
  `).get(property.id, phone);
  if (duplicate) {
    return NextResponse.json({
      message: "We have already received your enquiry for this property. Our team will contact you shortly.",
      alreadyReceived: true,
      property: { title: property.title, city: property.city, locality: property.locality },
    }, { status: 200 });
  }

  const inquiryId = newId();
  const notificationId = newId();
  const priorVisitorId = request.cookies.get("nilay_visitor")?.value ?? "";
  const guestVisitorId = /^[0-9a-f-]{36}$/i.test(priorVisitorId) ? priorVisitorId : randomUUID();
  const inquiryMessage = message || "I am interested in this property. Please share more details and arrange a site visit.";

  const saveInquiry = db.transaction(() => {
    db.prepare(`
      INSERT INTO inquiries (id, propertyId, userId, name, email, phone, message, contactMethod, preferredTimeline, fundingReadiness, contactConsent, source, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'new')
    `).run(inquiryId, property.id, user?.id ?? null, name, email, phone, inquiryMessage, contactMethod, preferredTimeline, fundingReadiness, source);

    db.prepare("INSERT INTO inquiry_notifications (id, inquiryId) VALUES (?, ?)").run(notificationId, inquiryId);

    // Synchronize to Leads CRM
    try {
      const leadId = newId();
      db.prepare(`
        INSERT INTO leads (id, type, referenceId, name, phone, email, status, source, notes, statusHistory, relatedPropertyIds)
        VALUES (?, 'buyer', ?, ?, ?, ?, 'new', ?, ?, ?, ?)
      `).run(
        leadId,
        inquiryId,
        name,
        phone,
        email,
        source,
        `Enquiry for ${property.title} in ${property.locality}, ${property.city}. Timeline: ${preferredTimeline || 'Unspecified'}, Funding: ${fundingReadiness || 'Unspecified'}. Note: ${inquiryMessage}`,
        JSON.stringify([{ status: "new", changedAt: new Date().toISOString(), note: `New enquiry on ${property.title}` }]),
        JSON.stringify([property.id])
      );
    } catch {
      // leads table fallback
    }
  });

  saveInquiry();

  if (user) {
    logMemberActivity(user.id, "Enquiry sent", "Requested more information.", { id: property.id, title: property.title });
  } else {
    logGuestActivity(name, guestVisitorId, "Enquiry sent", "Requested more information.", { id: property.id, title: property.title });
  }

  const delivery = await deliverPendingInquiryNotices(inquiryId);
  const response = NextResponse.json({
    message: delivery.pending
      ? "Your enquiry was received. Its notification is queued; our team will follow up with you shortly."
      : "Your enquiry was sent. Our team will reach out to you shortly to arrange next steps or a site visit.",
    notificationPending: delivery.pending > 0,
    property: {
      title: property.title,
      type: property.type,
      listingCategory: property.listingCategory,
      pricePeriod: property.pricePeriod,
      city: property.city,
      locality: property.locality,
      area: property.area,
      unit: property.unit,
      price: property.price,
    },
  }, { status: 201 });

  if (!user && guestVisitorId !== priorVisitorId) {
    response.cookies.set("nilay_visitor", guestVisitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
