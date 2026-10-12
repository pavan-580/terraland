import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, newId } from "@/lib/session";
import { sendLenderInterestNotice } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  if (!await currentUser()) {
    return NextResponse.json({ error: "Sign in to register as a lender." }, { status: 401 });
  }
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Please complete the lender interest form." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim().replace(/[\s()-]/g, "") : "";
  const amount = Number(input.amount);
  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (name.length < 2 || name.length > 80 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      !/^\+[1-9]\d{7,14}$/.test(phone) ||
      !Number.isSafeInteger(amount) || amount < 1000 || amount > 10000000000 ||
      message.length > 500 || input.consent !== true) {
    return NextResponse.json({ error: "Check your contact details, amount, and consent, then try again." }, { status: 400 });
  }

  const id = newId();
  db.prepare("INSERT INTO lender_interests (id, name, email, phone, amount, message, consentedAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)")
    .run(id, name, email, phone, amount, message);

  let notificationPending = false;
  try {
    await sendLenderInterestNotice({ name, email, phone, amount, message, createdAt: new Date().toISOString() });
    db.prepare("UPDATE lender_interests SET notificationStatus = 'sent', notificationError = NULL WHERE id = ?").run(id);
  } catch (error) {
    notificationPending = true;
    const detail = error instanceof Error ? error.message : "Email notification failed.";
    db.prepare("UPDATE lender_interests SET notificationError = ? WHERE id = ?").run(detail.slice(0, 500), id);
    console.error("Lender interest " + id + " saved; admin email remains pending:", error);
  }

  return NextResponse.json({
    message: "Your interest has been saved. The NILAY team will contact you using the details you provided.",
    notificationPending,
  }, { status: 201 });
}
