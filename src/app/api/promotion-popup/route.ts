import { NextResponse } from "next/server";
import { db, getSiteSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (getSiteSetting("popupAdEnabled") !== "true") return NextResponse.json({ ad: null });
  const propertyId = getSiteSetting("popupAdPropertyId")?.trim();
  if (!propertyId) return NextResponse.json({ ad: null });

  const row = db.prepare(`
    SELECT id, title, city, locality, price, area, unit, image
    FROM properties
    WHERE id = ? AND status = 'published' AND listingCategory = 'sale'
  `).get(propertyId) as { id: string; title: string; city: string; locality: string; price: number; area: number; unit: string; image: string } | undefined;

  if (!row) return NextResponse.json({ ad: null });
  return NextResponse.json({ ad: row });
}
