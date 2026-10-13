import { compare, hash } from "bcryptjs";
import { randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db, logMemberActivity } from "@/lib/db";
import { sendPasswordResetCode } from "@/lib/notifications";

export const runtime = "nodejs";

const genericMessage = "If an account exists for that email, a reset code has been sent.";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Please enter valid details." }, { status: 400 });
  const input = body as Record<string, unknown>;
  const action = input.action;
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!emailPattern.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  if (action === "request") {
    const existing = db.prepare("SELECT requestedAt FROM password_reset_codes WHERE email = ?").get(email) as { requestedAt: string } | undefined;
    if (existing && Date.now() - new Date(existing.requestedAt).getTime() < 60_000) {
      return NextResponse.json({ message: genericMessage });
    }
    const user = db.prepare("SELECT id FROM users WHERE email = ? AND role = 'user'").get(email);
    if (user) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const codeHash = await hash(code, 10);
      const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
      db.prepare(`INSERT INTO password_reset_codes (email, codeHash, expiresAt, requestedAt, attempts)
        VALUES (?, ?, ?, ?, 0) ON CONFLICT(email) DO UPDATE SET
        codeHash = excluded.codeHash, expiresAt = excluded.expiresAt, requestedAt = excluded.requestedAt, attempts = 0`)
        .run(email, codeHash, expiresAt, new Date().toISOString());
      try {
        await sendPasswordResetCode(email, code);
      } catch {
        db.prepare("DELETE FROM password_reset_codes WHERE email = ?").run(email);
        return NextResponse.json({ error: "We couldn't send the reset email. Please try again later." }, { status: 503 });
      }
    }
    return NextResponse.json({ message: genericMessage });
  }

  if (action === "reset") {
    const code = String(input.code ?? "").trim();
    const password = String(input.password ?? "");
    const confirmPassword = String(input.confirmPassword ?? "");
    if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the six-digit code from your email." }, { status: 400 });
    if (password.length < 8 || password.length > 72) return NextResponse.json({ error: "Choose a password between 8 and 72 characters." }, { status: 400 });
    if (password !== confirmPassword) return NextResponse.json({ error: "The passwords do not match." }, { status: 400 });
    const reset = db.prepare("SELECT codeHash, expiresAt, attempts FROM password_reset_codes WHERE email = ?").get(email) as
      { codeHash: string; expiresAt: string; attempts: number } | undefined;
    if (!reset || new Date(reset.expiresAt).getTime() <= Date.now() || reset.attempts >= 5) {
      db.prepare("DELETE FROM password_reset_codes WHERE email = ?").run(email);
      return NextResponse.json({ error: "That code is invalid or expired. Request a new code." }, { status: 400 });
    }
    if (!(await compare(code, reset.codeHash))) {
      db.prepare("UPDATE password_reset_codes SET attempts = attempts + 1 WHERE email = ?").run(email);
      return NextResponse.json({ error: "That code is incorrect. Check the email and try again." }, { status: 400 });
    }
    const passwordHash = await hash(password, 12);
    const applyReset = db.transaction(() => {
      const result = db.prepare("UPDATE users SET passwordHash = ? WHERE email = ? AND role = 'user'").run(passwordHash, email);
      if (result.changes !== 1) throw new Error("Account not found.");
      db.prepare("DELETE FROM sessions WHERE userId = (SELECT id FROM users WHERE email = ?)").run(email);
      db.prepare("DELETE FROM password_reset_codes WHERE email = ?").run(email);
    });
    try {
      applyReset();
    } catch {
      return NextResponse.json({ error: "We couldn't reset that account. Request a new code and try again." }, { status: 400 });
    }
    const resetUser = db.prepare("SELECT id FROM users WHERE email = ? AND role = 'user'").get(email) as { id: string } | undefined;
    if (resetUser) logMemberActivity(resetUser.id, "Password changed", "Password reset using email verification.");
    return NextResponse.json({ message: "Your password has been changed. Sign in with your new password." });
  }

  return NextResponse.json({ error: "Choose a valid password reset action." }, { status: 400 });
}
