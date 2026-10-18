import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, newId } from "@/lib/session";

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
  const type = searchParams.get("type"); // 'buyer' | 'seller' | null
  const status = searchParams.get("status");

  let query = "SELECT * FROM leads";
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (type) {
    conditions.push("type = ?");
    params.push(type);
  }
  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " ORDER BY createdAt DESC";

  const leads = db.prepare(query).all(...params);
  return NextResponse.json({ leads });
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
    name, phone, email = "", type = "buyer", source = "manual_entry",
    notes = "", nextFollowUpDate = null
  } = body as Record<string, unknown>;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Lead name is required." }, { status: 400 });
  }
  if (!phone || typeof phone !== "string" || phone.trim().length < 8) {
    return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  }

  const id = newId();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO leads (
      id, type, name, phone, email, status, source,
      assignedPerson, notes, nextFollowUpDate, statusHistory, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, 'new', ?, 'Founder', ?, ?, ?, ?, ?)
  `).run(
    id,
    String(type),
    String(name).trim(),
    String(phone).trim(),
    String(email).trim(),
    String(source),
    String(notes).trim(),
    nextFollowUpDate ? String(nextFollowUpDate) : null,
    JSON.stringify([{ status: "new", changedAt: now, note: "Manually entered by founder" }]),
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
    id, status, notes, lastContactDate, nextFollowUpDate, appendNote
  } = body as Record<string, unknown>;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Lead ID is required." }, { status: 400 });
  }

  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(id) as {
    id: string; status: string; notes: string; statusHistory: string;
  } | undefined;

  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const now = new Date().toISOString();
  let updatedHistory = lead.statusHistory;

  if (status && status !== lead.status) {
    try {
      const history = JSON.parse(lead.statusHistory || "[]");
      history.push({
        status,
        changedAt: now,
        note: appendNote || `Status changed from ${lead.status} to ${status}`
      });
      updatedHistory = JSON.stringify(history);
    } catch {
      updatedHistory = JSON.stringify([{ status, changedAt: now }]);
    }
  }

  const updatedNotes = appendNote
    ? (lead.notes ? `${lead.notes}\n[${now.slice(0, 10)}]: ${appendNote}` : `[${now.slice(0, 10)}]: ${appendNote}`)
    : (notes !== undefined ? String(notes) : lead.notes);

  db.prepare(`
    UPDATE leads
    SET status = COALESCE(?, status),
        notes = ?,
        statusHistory = ?,
        lastContactDate = COALESCE(?, lastContactDate),
        nextFollowUpDate = COALESCE(?, nextFollowUpDate),
        updatedAt = ?
    WHERE id = ?
  `).run(
    status ?? null,
    updatedNotes,
    updatedHistory,
    lastContactDate ?? null,
    nextFollowUpDate ?? null,
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
    return NextResponse.json({ error: "Lead ID is required." }, { status: 400 });
  }

  db.prepare("DELETE FROM leads WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}

