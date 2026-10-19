import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to view your requirements." }, { status: 401 });

  const requirements = db.prepare(`
    SELECT id, preferredLocation, minBudget, maxBudget, minPlotSize, maxPlotSize,
      intendedUse, timeline, status, createdAt
    FROM buyer_requirements
    WHERE userId = ?
    ORDER BY createdAt DESC
  `).all(user.id);

  return NextResponse.json({ requirements });
}
