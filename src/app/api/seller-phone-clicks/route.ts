import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db, getSiteSetting, logMemberActivity } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { propertyId?: unknown; contactMethod?: unknown } | null;
  const propertyId = typeof body?.propertyId === "string" ? body.propertyId.trim().slice(0, 100) : "";
  const contactMethod = body?.contactMethod === "whatsapp" ? "whatsapp" : "phone";
  if (!propertyId || (contactMethod === "phone" && getSiteSetting("showSellerPhones") === "false")) {
    return NextResponse.json({ error: "Seller contact is not available." }, { status: 404 });
  }

  const property = db.prepare(`
    SELECT id, title, owner, phone, showPhone FROM properties
    WHERE id = ? AND status = 'published'
  `).get(propertyId) as { id: string; title: string; owner: string; phone: string; showPhone: number } | undefined;
  if (!property || (contactMethod === "phone" && (!property.showPhone || !property.phone.trim()))) {
    return NextResponse.json({ error: "Seller contact is not available." }, { status: 404 });
  }

  const user = await currentUser();
  const priorVisitorId = request.cookies.get("nilay_visitor")?.value ?? "";
  const visitorId = /^[0-9a-f-]{36}$/i.test(priorVisitorId) ? priorVisitorId : randomUUID();
  db.prepare(`
    INSERT INTO seller_phone_clicks
      (id, propertyId, propertyTitle, sellerName, userId, userName, userPhone, visitorId, contactMethod)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), property.id, property.title, property.owner, user?.id ?? "", user?.name ?? "", user?.phone ?? "", visitorId, contactMethod);
  if (user) {
    logMemberActivity(user.id, contactMethod === "whatsapp" ? "Opened WhatsApp contact" : "Opened seller phone", contactMethod === "whatsapp" ? "Prepared a WhatsApp message to NILAY customer care." : "Selected the seller phone number.", { id: property.id, title: property.title });
  }

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
