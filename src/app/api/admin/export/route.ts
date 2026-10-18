import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

async function requireAdmin() {
  const user = await currentUser();
  return user?.role === "admin" ? user : null;
}

function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) return "";
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: Record<string, unknown>[], headers: string[]): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const bodyLines = rows.map((row) =>
    headers.map((h) => escapeCsvField(row[h])).join(",")
  );
  return [headerLine, ...bodyLines].join("\r\n");
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "leads";
  const dateStr = new Date().toISOString().slice(0, 10);

  if (type === "leads") {
    const leads = db.prepare(`
      SELECT id, type, name, phone, email, status, source, assignedPerson,
             notes, lastContactDate, nextFollowUpDate, createdAt
      FROM leads ORDER BY createdAt DESC
    `).all() as Record<string, unknown>[];

    const headers = [
      "id", "type", "name", "phone", "email", "status", "source",
      "assignedPerson", "notes", "lastContactDate", "nextFollowUpDate", "createdAt"
    ];
    const csv = toCsv(leads, headers);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="terraland-leads-${dateStr}.csv"`
      }
    });
  }

  if (type === "inquiries") {
    const inquiries = db.prepare(`
      SELECT i.id, i.propertyId, p.title AS propertyTitle, p.locality, p.city,
             i.name, i.phone, i.email, i.message, i.contactMethod, i.preferredTimeline,
             i.fundingReadiness, i.source, i.createdAt
      FROM inquiries i
      LEFT JOIN properties p ON p.id = i.propertyId
      ORDER BY i.createdAt DESC
    `).all() as Record<string, unknown>[];

    const headers = [
      "id", "propertyId", "propertyTitle", "locality", "city",
      "name", "phone", "email", "message", "contactMethod", "preferredTimeline",
      "fundingReadiness", "source", "createdAt"
    ];
    const csv = toCsv(inquiries, headers);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="terraland-inquiries-${dateStr}.csv"`
      }
    });
  }

  if (type === "buyer_requirements") {
    const requirements = db.prepare(`
      SELECT id, name, phone, email, preferredLocation, minBudget, maxBudget,
             minPlotSize, maxPlotSize, intendedUse, timeline, fundingReadiness,
             preferredContactMethod, source, status, notes, createdAt
      FROM buyer_requirements ORDER BY createdAt DESC
    `).all() as Record<string, unknown>[];

    const headers = [
      "id", "name", "phone", "email", "preferredLocation", "minBudget", "maxBudget",
      "minPlotSize", "maxPlotSize", "intendedUse", "timeline", "fundingReadiness",
      "preferredContactMethod", "source", "status", "notes", "createdAt"
    ];
    const csv = toCsv(requirements, headers);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="terraland-buyer-requirements-${dateStr}.csv"`
      }
    });
  }

  return NextResponse.json({ error: "Invalid export type." }, { status: 400 });
}

