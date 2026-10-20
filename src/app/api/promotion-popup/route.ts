import { NextResponse } from "next/server";
import { db, getSiteSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const announcement = { enabled: getSiteSetting("announcementEnabled") === "true", text: getSiteSetting("announcementText") ?? "" };
  if (getSiteSetting("popupAdEnabled") !== "true") return NextResponse.json({ ad: null, announcement });
  const propertyId = getSiteSetting("popupAdPropertyId")?.trim();
  if (!propertyId) return NextResponse.json({ ad: null, announcement });

  const row = db.prepare(`
    SELECT id, title, city, locality, price, area, unit, image
    FROM properties
    WHERE id = ? AND status = 'published' AND listingCategory = 'sale'
  `).get(propertyId) as { id: string; title: string; city: string; locality: string; price: number; area: number; unit: string; image: string } | undefined;

  if (!row) return NextResponse.json({ ad: null, announcement });
  return NextResponse.json({ ad: { ...row, kicker: getSiteSetting("popupAdKicker") ?? "IMPORTANT ANNOUNCEMENT", heading: getSiteSetting("popupAdTitle") ?? "", date: getSiteSetting("popupAdDate") ?? "", body: getSiteSetting("popupAdBody") ?? "", image: getSiteSetting("popupAdImage")?.trim() || row.image }, announcement });
}
