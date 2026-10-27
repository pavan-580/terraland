import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, newId } from "@/lib/session";

async function requireAdmin() {
  const user = await currentUser();
  return user?.role === "admin" ? user : null;
}

import { evaluateTransparentMatch } from "@/lib/matchmaker";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const recalculate = searchParams.get("recalculate") === "true";

  if (recalculate) {
    // Generate or update rule-based matches
    const requirements = db.prepare(`
      SELECT * FROM buyer_requirements WHERE status NOT IN ('closed', 'cancelled')
    `).all() as {
      id: string; preferredLocation: string; minBudget: number; maxBudget: number;
      minPlotSize: number; maxPlotSize: number; intendedUse: string;
    }[];

    const properties = db.prepare(`
      SELECT id, title, locality, city, price, area, unit, isNegotiable
      FROM properties WHERE status = 'published'
    `).all() as {
      id: string; title: string; locality: string; city: string; price: number; area: number; unit: string; isNegotiable?: string;
    }[];

    for (const req of requirements) {
      for (const prop of properties) {
        const match = evaluateTransparentMatch(req, prop);
        if (match) {
          const existing = db.prepare(`
            SELECT id, status FROM property_matches
            WHERE buyerRequirementId = ? AND propertyId = ?
          `).get(req.id, prop.id) as { id: string; status: string } | undefined;

          if (!existing) {
            db.prepare(`
              INSERT INTO property_matches (id, buyerRequirementId, propertyId, score, explanation, status)
              VALUES (?, ?, ?, ?, ?, 'pending_review')
            `).run(newId(), req.id, prop.id, match.score, JSON.stringify(match.explanations));
          } else if (existing.status === "pending_review") {
            db.prepare(`
              UPDATE property_matches SET score = ?, explanation = ?
              WHERE id = ?
            `).run(match.score, JSON.stringify(match.explanations), existing.id);
          }
        }
      }
    }
  }

  const matches = db.prepare(`
    SELECT
      pm.id, pm.score, pm.explanation, pm.status, pm.reviewedAt, pm.reviewedBy, pm.createdAt,
      br.id AS requirementId, br.name AS buyerName, br.phone AS buyerPhone, br.email AS buyerEmail,
      br.preferredLocation, br.minBudget, br.maxBudget, br.minPlotSize, br.maxPlotSize, br.timeline,
      p.id AS propertyId, p.title AS propertyTitle, p.locality AS propertyLocality, p.city AS propertyCity,
      p.price AS propertyPrice, p.area AS propertyArea, p.unit AS propertyUnit, p.owner AS sellerName,
      p.phone AS sellerPhone, p.isNegotiable
    FROM property_matches pm
    JOIN buyer_requirements br ON br.id = pm.buyerRequirementId
    JOIN properties p ON p.id = pm.propertyId
    ORDER BY pm.score DESC, pm.createdAt DESC
  `).all();

  return NextResponse.json({ matches });
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

  const { id, status } = body as { id?: string; status?: string };
  const validStatuses = ["pending_review", "approved", "presented_to_buyer", "site_visit_arranged", "rejected"];

  if (!id || !status || !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Valid match ID and status required." }, { status: 400 });
  }

  db.prepare(`
    UPDATE property_matches
    SET status = ?, reviewedAt = CURRENT_TIMESTAMP, reviewedBy = ?
    WHERE id = ?
  `).run(status, admin.name, id);

  return NextResponse.json({ success: true, status });
}

