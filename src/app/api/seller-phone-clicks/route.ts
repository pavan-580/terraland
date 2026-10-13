import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db, getSiteSetting } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { propertyId?: unknown } | null;
  const propertyId = typeof body?.propertyId === "string" ? body.propertyId.trim().slice(0, 100) : "";
  if (!propertyId || getSiteSetting("showSellerPhones") === "false") {
    return NextResponse.json({ error: "Seller contact is not available." }, { status: 404 });
  }

  const property = db.prepare(`
    SELECT id, title, owner, phone FROM properties
    WHERE id = ? AND status = 'published' AND showPhone = 1 AND TRIM(phone) != ''
  `).get(propertyId) as { id: string; title: string; owner: string; phone: string } | undefined;
  if (!property) return NextResponse.json({ error: "Seller contact is not available." }, { status: 404 });

  const user = await currentUser();
  const priorVisitorId = request.cookies.get("nilay_visitor")?.value ?? "";
  const visitorId = /^[0-9a-f-]{36}$/i.test(priorVisitorId) ? priorVisitorId : randomUUID();
  db.prepare(`
    INSERT INTO seller_phone_clicks
      (id, propertyId, propertyTitle, sellerName, userId, userName, userPhone, visitorId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), property.id, property.title, property.owner, user?.id ?? "", user?.name ?? "", user?.phone ?? "", visitorId);

  const response = new NextResponse(null, { status: 204 });
  if (visitorId !== priorVisitorId) {
    response.cookies.set("nilay_visitor", visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
