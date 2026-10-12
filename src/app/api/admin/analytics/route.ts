import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

async function isAdmin() { return (await currentUser())?.role === "admin"; }

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const daily = db.prepare(`SELECT visitDate AS period, COUNT(*) AS visitors, SUM(pageViews) AS pageViews FROM visitor_daily_counts WHERE visitDate >= date('now', '+330 minutes', '-29 days') GROUP BY visitDate ORDER BY visitDate`).all();
  const monthly = db.prepare(`SELECT substr(visitDate, 1, 7) AS period, COUNT(DISTINCT visitorId) AS visitors, SUM(pageViews) AS pageViews FROM visitor_daily_counts WHERE visitDate >= strftime('%Y-%m', date('now', '+330 minutes', 'start of month', '-11 months')) || '-01' GROUP BY substr(visitDate, 1, 7) ORDER BY period`).all();
  return NextResponse.json({ daily, monthly });
}

export async function DELETE() {
  if (!await isAdmin()) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const result = db.prepare("DELETE FROM visitor_daily_counts").run();
  return NextResponse.json({ message: `Cleared analytics for ${result.changes} visitor-day records.` });
}
