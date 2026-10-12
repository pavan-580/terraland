import { NextRequest, NextResponse } from "next/server";
import { db, getSiteSetting, publicPropertyFromRow } from "@/lib/db";
import { currentUser } from "@/lib/session";

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
  const exists = db.prepare("SELECT 1 FROM properties WHERE id = ? AND status = 'published'").get(propertyId);
  if (!exists) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  db.prepare("INSERT OR IGNORE INTO favorites (userId, propertyId) VALUES (?, ?)").run(user.id, propertyId);
  return NextResponse.json({ saved: true });
}

export async function DELETE(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage saved listings." }, { status: 401 });
  const propertyId = request.nextUrl.searchParams.get("propertyId");
  if (!propertyId) return NextResponse.json({ error: "Choose a listing to remove." }, { status: 400 });
  db.prepare("DELETE FROM favorites WHERE userId = ? AND propertyId = ?").run(user.id, propertyId);
  return NextResponse.json({ saved: false });
}
