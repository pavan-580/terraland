import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, newId } from "@/lib/session";

async function requireAdmin() {
  const user = await currentUser();
  return user?.role === "admin" ? user : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const packages = db.prepare(`
    SELECT sp.*, p.title AS propertyTitle, p.locality, p.city
    FROM service_packages sp
    LEFT JOIN properties p ON p.id = sp.propertyId
    ORDER BY sp.createdAt DESC
  `).all();

  return NextResponse.json({ packages });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const {
    clientName, clientPhone, clientEmail = "", clientRole = "seller",
    propertyId = null, packageType = "free_listing", agreedPrice = 0,
    durationDays = 30, invoiceStatus = "draft", paymentStatus = "unpaid",
    deliverables = "", notes = ""
  } = body as Record<string, unknown>;

  if (!clientName || typeof clientName !== "string" || clientName.trim().length < 2) {
    return NextResponse.json({ error: "Client name is required." }, { status: 400 });
  }
  if (!clientPhone || typeof clientPhone !== "string" || clientPhone.trim().length < 8) {
    return NextResponse.json({ error: "Client phone number is required." }, { status: 400 });
  }

  const id = newId();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO service_packages (
      id, clientName, clientPhone, clientEmail, clientRole,
      propertyId, packageType, agreedPrice, durationDays,
      invoiceStatus, paymentStatus, deliverables, notes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    String(clientName).trim(),
    String(clientPhone).trim(),
    String(clientEmail).trim(),
    String(clientRole),
    propertyId ? String(propertyId) : null,
    String(packageType),
    Number(agreedPrice) || 0,
    Number(durationDays) || 30,
    String(invoiceStatus),
    String(paymentStatus),
    String(deliverables).trim(),
    String(notes).trim(),
    now,
    now
  );

  return NextResponse.json({ success: true, id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const {
    id, invoiceStatus, paymentStatus, deliverables, notes, packageType, agreedPrice, durationDays
  } = body as Record<string, unknown>;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Package ID is required." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const paymentConfirmedAt = paymentStatus === "paid" ? now : null;

  db.prepare(`
    UPDATE service_packages
    SET invoiceStatus = COALESCE(?, invoiceStatus),
        paymentStatus = COALESCE(?, paymentStatus),
        deliverables = COALESCE(?, deliverables),
        notes = COALESCE(?, notes),
        packageType = COALESCE(?, packageType),
        agreedPrice = COALESCE(?, agreedPrice),
        durationDays = COALESCE(?, durationDays),
        paymentConfirmedAt = CASE WHEN ? = 'paid' THEN ? ELSE paymentConfirmedAt END,
        updatedAt = ?
    WHERE id = ?
  `).run(
    invoiceStatus ?? null,
    paymentStatus ?? null,
    deliverables ?? null,
    notes ?? null,
    packageType ?? null,
    agreedPrice !== undefined ? Number(agreedPrice) : null,
    durationDays !== undefined ? Number(durationDays) : null,
    paymentStatus ?? null,
    paymentConfirmedAt,
    now,
    id
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Package ID is required." }, { status: 400 });
  }

  db.prepare("DELETE FROM service_packages WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}

