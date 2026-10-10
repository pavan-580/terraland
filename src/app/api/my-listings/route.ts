import { NextResponse } from "next/server";
import { db, propertyFromRow } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to see your listings." }, { status: 401 });
  const rows = db.prepare("SELECT * FROM properties WHERE ownerId = ? ORDER BY createdAt DESC")
    .all(user.id) as Record<string, unknown>[];
  return NextResponse.json(rows.map(propertyFromRow));
}
