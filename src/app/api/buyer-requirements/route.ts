import { NextRequest, NextResponse } from "next/server";
import { db, logMemberActivity } from "@/lib/db";
import { currentUser, newId } from "@/lib/session";
import { sendBuyerRequirementNotice } from "@/lib/notifications";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

async function requireAdmin() {
  const user = await currentUser();
  return user?.role === "admin" ? user : null;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = "SELECT * FROM buyer_requirements";
  const params: unknown[] = [];
  if (status) {
    query += " WHERE status = ?";
    params.push(status);
  }
  query += " ORDER BY createdAt DESC";

  const requirements = db.prepare(query).all(...params);
  return NextResponse.json({ requirements });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(`buyer-req:${ip}`, 5, 300);
  if (!rate.allowed) {
    return NextResponse.json({
      error: `Too many submissions. Please wait ${rate.resetInSeconds} seconds before submitting again.`
    }, { status: 429 });
  }

  const user = await currentUser();
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid requirement submission payload." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const name = user?.name ?? (typeof input.name === "string" ? input.name.trim() : "");
  const rawPhone = typeof input.phone === "string" ? input.phone.trim().replace(/[\s()-]/g, "") : user?.phone ?? "";
  const phone = /^\d{10}$/.test(rawPhone) ? `+91${rawPhone}` : rawPhone;
  const email = user?.email || (typeof input.email === "string" ? input.email.trim().toLowerCase() : "");
  const preferredLocation = typeof input.preferredLocation === "string" && input.preferredLocation.trim()
    ? input.preferredLocation.trim().slice(0, 100)
    : "Miyapur, Hyderabad";
  const minBudget = Number(input.minBudget) >= 0 ? Number(input.minBudget) : 0;
  const maxBudget = Number(input.maxBudget) >= 0 ? Number(input.maxBudget) : 0;
  const minPlotSize = Number(input.minPlotSize) >= 0 ? Number(input.minPlotSize) : 0;
  const maxPlotSize = Number(input.maxPlotSize) >= 0 ? Number(input.maxPlotSize) : 0;
  const intendedUse = typeof input.intendedUse === "string" ? input.intendedUse.trim().slice(0, 100) : "residential_construction";
  const timeline = typeof input.timeline === "string" ? input.timeline.trim().slice(0, 80) : "immediate";
  const fundingReadiness = typeof input.fundingReadiness === "string" ? input.fundingReadiness.trim().slice(0, 80) : "self_funded";
  const preferredContactMethod = ["phone", "whatsapp", "email"].includes(String(input.preferredContactMethod))
    ? String(input.preferredContactMethod)
    : "phone";
  const contactConsent = input.contactConsent === true || input.contactConsent === "true" || input.contactConsent === 1;
  const source = typeof input.source === "string" ? input.source.trim().slice(0, 60) : "buyer_requirement_form";
  const notes = typeof input.notes === "string" ? input.notes.trim().slice(0, 1000) : "";

  // Validation
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Please enter a valid name (2-80 characters)." }, { status: 400 });
  }
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return NextResponse.json({ error: "Please enter a valid 10-digit mobile number." }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!contactConsent) {
    return NextResponse.json({ error: "You must consent to being contacted by NILAY." }, { status: 400 });
  }

  // Duplicate submission check: same phone within 2 minutes
  const duplicate = db.prepare(`
    SELECT id FROM buyer_requirements
    WHERE phone = ? AND datetime(createdAt) > datetime('now', '-2 minutes')
  `).get(phone);
  if (duplicate) {
    return NextResponse.json({
      success: true,
      message: "We have already received your requirement. The founder will contact you shortly to share matching verified plots.",
      alreadyReceived: true
    }, { status: 200 });
  }

  const reqId = newId();
  const leadId = newId();
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(`
      INSERT INTO buyer_requirements (
        id, userId, name, phone, email, preferredLocation,
        minBudget, maxBudget, minPlotSize, maxPlotSize,
        intendedUse, timeline, fundingReadiness, preferredContactMethod,
        contactConsent, source, status, assignedTo, notes, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'new', 'Founder', ?, ?, ?)
    `).run(
      reqId,
      user?.id ?? null,
      name,
      phone,
      email,
      preferredLocation,
      minBudget,
      maxBudget,
      minPlotSize,
      maxPlotSize,
      intendedUse,
      timeline,
      fundingReadiness,
      preferredContactMethod,
      source,
      notes,
      now,
      now
    );

    // Sync into unified Leads CRM
    try {
      const budgetDesc = (minBudget || maxBudget)
        ? `₹${minBudget.toLocaleString("en-IN")} - ₹${maxBudget.toLocaleString("en-IN")}`
        : "Flexible";
      const sizeDesc = (minPlotSize || maxPlotSize)
        ? `${minPlotSize} - ${maxPlotSize} sq. yd.`
        : "Flexible";

      db.prepare(`
        INSERT INTO leads (
          id, type, referenceId, name, phone, email, status, source,
          assignedPerson, notes, statusHistory, consentStatus, createdAt, updatedAt
        ) VALUES (?, 'buyer', ?, ?, ?, ?, 'new', ?, 'Founder', ?, ?, 'consented', ?, ?)
      `).run(
        leadId,
        reqId,
        name,
        phone,
        email,
        source,
        `Buyer requirement in ${preferredLocation}. Budget: ${budgetDesc}. Size: ${sizeDesc}. Timeline: ${timeline}. Funding: ${fundingReadiness}. Preferred: ${preferredContactMethod}. Notes: ${notes || "None"}`,
        JSON.stringify([{
          status: "new",
          changedAt: now,
          note: `New buyer requirement registered for ${preferredLocation}`
        }]),
        now,
        now
      );
    } catch (leadError) {
      console.error("Lead sync error:", leadError);
    }
  })();

  if (user) {
    logMemberActivity(user.id, "Buyer requirement registered", `Registered requirement for ${preferredLocation}`);
  }

  // Queue or send notification asynchronously
  sendBuyerRequirementNotice({
    id: reqId,
    name,
    phone,
    email: email || undefined,
    preferredLocation,
    minBudget,
    maxBudget,
    minPlotSize,
    maxPlotSize,
    intendedUse,
    timeline,
    fundingReadiness,
    preferredContactMethod,
    notes,
    source,
    createdAt: now
  }).catch((err) => console.error("Error dispatching buyer requirement notification:", err));

  return NextResponse.json({
    success: true,
    message: "Your residential plot requirement has been registered. Our Miyapur specialist will contact you directly with matching verified plots.",
    id: reqId
  }, { status: 201 });
}

