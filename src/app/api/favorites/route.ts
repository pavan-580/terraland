import { NextRequest, NextResponse } from "next/server";
import { db, getSiteSetting, logMemberActivity, publicPropertyFromRow } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { recordCustomerListingInterest } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const propertyId = request.nextUrl.searchParams.get("propertyId");
  const user = await currentUser();
  if (propertyId) {
    if (!user) return NextResponse.json({ saved: false });
    const saved = db.prepare("SELECT 1 FROM favorites WHERE userId = ? AND propertyId = ?").get(user.id, propertyId);
    return NextResponse.json({ saved: Boolean(saved) });
  }
  if (!user) return NextResponse.json({ error: "Sign in to view your saved listings." }, { status: 401 });
  const rows = db.prepare(`
    SELECT properties.*, users.email AS sellerEmail FROM favorites
    JOIN properties ON properties.id = favorites.propertyId
    LEFT JOIN users ON users.id = properties.ownerId
    WHERE favorites.userId = ? ORDER BY favorites.createdAt DESC
  `).all(user.id) as Record<string, unknown>[];
  const showSellerPhones = getSiteSetting("showSellerPhones") !== "false" && Boolean(user);
  return NextResponse.json(rows.map((row) => {
    return publicPropertyFromRow(row, showSellerPhones);
  }), { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to save listings." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const propertyId = body && typeof body === "object" ? String((body as Record<string, unknown>).propertyId ?? "") : "";
  const property = db.prepare("SELECT id, title FROM properties WHERE id = ? AND status = 'published'").get(propertyId) as { id: string; title: string } | undefined;
  if (!property) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  const result = db.prepare("INSERT OR IGNORE INTO favorites (userId, propertyId) VALUES (?, ?)").run(user.id, propertyId);
  if (result.changes) {
    logMemberActivity(user.id, "Added listing to favorites", "Saved to favorites.", property);
    if (user.email) {
      recordCustomerListingInterest({
        customerEmail: user.email,
        customerName: user.name,
        customerPhone: user.phone,
        propertyId: property.id,
        userId: user.id,
        source: "favorite",
      });
    }
  }
  return NextResponse.json({ saved: true });
}

export async function DELETE(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage saved listings." }, { status: 401 });
  const propertyId = request.nextUrl.searchParams.get("propertyId");
  if (!propertyId) return NextResponse.json({ error: "Choose a listing to remove." }, { status: 400 });
  const property = db.prepare("SELECT id, title FROM properties WHERE id = ?").get(propertyId) as { id: string; title: string } | undefined;
  const result = db.prepare("DELETE FROM favorites WHERE userId = ? AND propertyId = ?").run(user.id, propertyId);
  if (result.changes) logMemberActivity(user.id, "Removed listing from favorites", "Removed from favorites.", property);
  return NextResponse.json({ saved: false });
}
