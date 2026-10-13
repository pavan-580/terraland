import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db, logGuestActivity, logMemberActivity } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (user?.role === "admin") return new NextResponse(null, { status: 204 });

  const body: unknown = await request.json().catch(() => null);
  const pathname = body && typeof body === "object" ? String((body as Record<string, unknown>).pathname ?? "") : "";
  const safePathname = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname.slice(0, 200) : "";

  const existingVisitorId = request.cookies.get("nilay_visitor")?.value ?? "";
  const visitorId = /^[0-9a-f-]{36}$/i.test(existingVisitorId) ? existingVisitorId : randomUUID();
  const visitDate = new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);

  db.prepare(`
    INSERT INTO visitor_daily_counts (visitorId, visitDate, pageViews)
    VALUES (?, ?, 1)
    ON CONFLICT(visitorId, visitDate) DO UPDATE SET pageViews = visitor_daily_counts.pageViews + 1
  `).run(visitorId, visitDate);
  if (safePathname) {
    if (user) logMemberActivity(user.id, "Viewed page", safePathname);
    else logGuestActivity(`Guest ${visitorId.slice(0, 8)}`, visitorId, "Viewed page", safePathname);
  }

  const response = new NextResponse(null, { status: 204 });
  if (visitorId !== existingVisitorId) {
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
