import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { dispatchDailyListingNurtureEmails, unsubscribeCustomerListingInterest } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: NextRequest, userRole?: string): boolean {
  if (userRole === "admin") return true;
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const cronSecret = process.env.CRON_SECRET || process.env.DAILY_BACKUP_SECRET || "nilay-cron-daily-key";
  if (token && token === cronSecret) return true;
  const paramKey = request.nextUrl.searchParams.get("key")?.trim();
  if (paramKey && paramKey === cronSecret) return true;
  return false;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action");

  // One-click unsubscribe handler
  if (action === "unsubscribe") {
    const email = searchParams.get("email");
    const propertyId = searchParams.get("propertyId") || undefined;
    if (!email) {
      return new NextResponse("Invalid unsubscribe request.", { status: 400 });
    }
    unsubscribeCustomerListingInterest(email, propertyId);
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unsubscribed · NILAY Real Estate</title>
      </head>
      <body style="font-family:sans-serif;background:#f3f4f6;padding:40px 20px;text-align:center;">
        <div style="max-width:480px;margin:auto;background:#ffffff;padding:32px 24px;border-radius:12px;border:1px solid #e5e7eb;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
          <div style="font-size:32px;margin-bottom:12px;">✅</div>
          <h2 style="color:#0b3b24;margin-top:0;">You have been unsubscribed</h2>
          <p style="color:#4b5563;font-size:14px;line-height:1.5;">
            You will no longer receive daily listing updates for this property at <strong>${email}</strong>.
          </p>
          <a href="/" style="display:inline-block;margin-top:16px;background:#0b3b24;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">Return to NILAY Home</a>
        </div>
      </body>
      </html>
    `, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const user = await currentUser();
  if (!isAuthorized(request, user?.role)) {
    return NextResponse.json({ error: "Unauthorized. Admin credentials or valid cron secret required." }, { status: 401 });
  }

  try {
    const result = await dispatchDailyListingNurtureEmails();
    return NextResponse.json({
      success: true,
      message: "Daily customer listing nurture sequence completed.",
      ...result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Nurture sequence encountered an error.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!isAuthorized(request, user?.role)) {
    return NextResponse.json({ error: "Unauthorized. Admin credentials required." }, { status: 401 });
  }

  try {
    const result = await dispatchDailyListingNurtureEmails();
    return NextResponse.json({
      success: true,
      message: "Daily customer listing nurture sequence dispatched.",
      ...result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to dispatch daily nurture.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

