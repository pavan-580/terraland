import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, newId } from "@/lib/session";
import { deliverPendingInquiryNotices } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in before sending an enquiry." }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Please send a valid enquiry." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const propertyId = typeof input.propertyId === "string" ? input.propertyId.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (!propertyId || propertyId.length > 100 || message.length > 1000) {
    return NextResponse.json({ error: "Please check the enquiry and try again." }, { status: 400 });
  }

  const property = db.prepare(`
    SELECT id, title, type, listingCategory, pricePeriod, city, locality, price, area, unit, address, mapUrl
    FROM properties WHERE id = ? AND status = 'published'
  `).get(propertyId) as {
    id: string; title: string; type: string; listingCategory: string; pricePeriod: string; city: string; locality: string; price: number;
    area: number; unit: string; address: string; mapUrl: string;
  } | undefined;
  if (!property) return NextResponse.json({ error: "This listing is no longer available." }, { status: 404 });

  const inquiryId = newId();
  const notificationId = newId();
  const inquiryMessage = message || "I am interested in this property. Please share more details.";
  const saveInquiry = db.transaction(() => {
    db.prepare(`
      INSERT INTO inquiries (id, propertyId, userId, name, email, phone, message)
      VALUES (?, ?, ?, ?, ?, '', ?)
    `).run(inquiryId, property.id, user.id, user.name, user.email, inquiryMessage);
    db.prepare("INSERT INTO inquiry_notifications (id, inquiryId) VALUES (?, ?)").run(notificationId, inquiryId);
  });
  saveInquiry();

  const delivery = await deliverPendingInquiryNotices(inquiryId);
  return NextResponse.json({
    message: delivery.pending
      ? "Your enquiry was received. Its email notification is queued for delivery; our team will follow up using your account email."
      : "Your enquiry was sent. Our team will reach you shortly using your account email.",
    notificationPending: delivery.pending > 0,
    property: { title: property.title, type: property.type, listingCategory: property.listingCategory, pricePeriod: property.pricePeriod, city: property.city, locality: property.locality, area: property.area, unit: property.unit, price: property.price },
  }, { status: 201 });
}
