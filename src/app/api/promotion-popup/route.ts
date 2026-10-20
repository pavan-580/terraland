import { NextResponse } from "next/server";
import { db, getSiteSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const announcement = {
    enabled: getSiteSetting("announcementEnabled") === "true",
    text: getSiteSetting("announcementText") ?? "",
  };

  const contact = {
    adminPhone: getSiteSetting("adminContactPhone") ?? "8074399963",
    carePhone: getSiteSetting("customerCarePhone") ?? "8074399963",
    careEmail: getSiteSetting("customerCareEmail") ?? "care@terraland.in",
  };

  if (getSiteSetting("popupAdEnabled") !== "true") {
    return NextResponse.json({ ad: null, announcement, contact });
  }

  const propertyId = getSiteSetting("popupAdPropertyId")?.trim();
  let row = propertyId
    ? (db.prepare(`
        SELECT id, title, city, locality, price, area, unit, image
        FROM properties
        WHERE id = ? AND status = 'published'
      `).get(propertyId) as { id: string; title: string; city: string; locality: string; price: number; area: number; unit: string; image: string } | undefined)
    : undefined;

  // Fallback to the newest published listing if no specific property is linked
  if (!row) {
    row = db.prepare(`
      SELECT id, title, city, locality, price, area, unit, image
      FROM properties
      WHERE status = 'published'
      ORDER BY createdAt DESC
      LIMIT 1
    `).get() as { id: string; title: string; city: string; locality: string; price: number; area: number; unit: string; image: string } | undefined;
  }

  const kicker = getSiteSetting("popupAdKicker") || "IMPORTANT ANNOUNCEMENT";
  const heading = getSiteSetting("popupAdTitle") || row?.title || "Special Property Announcement";
  const date = getSiteSetting("popupAdDate") || "Verified Listing";
  const body = getSiteSetting("popupAdBody") || (row ? `${[row.locality, row.city].filter(Boolean).join(", ")} · Verified residential plot.` : "Exclusive plot opportunity in Hyderabad.");
  const image = getSiteSetting("popupAdImage")?.trim() || row?.image || "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80";

  return NextResponse.json({
    ad: {
      id: row?.id || "",
      title: row?.title || heading,
      city: row?.city || "Hyderabad",
      locality: row?.locality || "Telangana",
      price: row?.price || 0,
      area: row?.area || 0,
      unit: row?.unit || "sq. yds",
      image,
      kicker,
      heading,
      date,
      body,
    },
    announcement,
    contact,
  });
}
