import { compare, hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, newId, startSession } from "@/lib/session";
import { deliverPendingRegistrationNotices } from "@/lib/notifications";

const ADMIN_EMAIL = "pavansai580@gmail.com";

export async function GET() {
  return NextResponse.json({ user: await currentUser() });
}

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Please send valid account details." }, { status: 400 });
  const input = body as Record<string, unknown>;
  const action = input.action === "signup" ? "signup" : input.action === "signin" ? "signin" : null;
  if (!action) {
    return NextResponse.json({ error: "Choose whether to create an account or sign in." }, { status: 400 });
  }
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password.trim() || password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: "Enter a valid email and a password of at least 8 characters." }, { status: 400 });
  }
  let user: { id: string; name: string; email: string; role: "user" | "admin" } | undefined;
  if (action === "signup") {
    const name = String(input.name ?? "").trim();
    if (name.length < 2 || name.length > 80) return NextResponse.json({ error: "Enter your name (2–80 characters)." }, { status: 400 });
    if (email === ADMIN_EMAIL) {
      return NextResponse.json({ error: "This email is reserved for the site administrator." }, { status: 409 });
    }
    if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    const id = newId();
    const notificationId = newId();
    const passwordHash = await hash(password, 12);
    try {
      const createAccount = db.transaction(() => {
        db.prepare("INSERT INTO users (id, name, email, passwordHash, role) VALUES (?, ?, ?, ?, 'user')")
          .run(id, name, email, passwordHash);
        db.prepare("INSERT INTO registration_notifications (id, name, email) VALUES (?, ?, ?)")
          .run(notificationId, name, email);
      });
      createAccount();
      user = { id, name, email, role: "user" };
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }
      throw error;
    }
    await deliverPendingRegistrationNotices(notificationId);
  } else if (email === ADMIN_EMAIL) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json({ error: "Admin sign-in is not configured on this server." }, { status: 503 });
    }
    if (password !== adminPassword) {
      return NextResponse.json({ error: "The email or password is incorrect." }, { status: 401 });
    }
    const id = db.prepare("SELECT id FROM users WHERE email = ?").get(ADMIN_EMAIL) as { id: string } | undefined;
    const adminId = id?.id ?? newId();
    db.prepare(`
      INSERT INTO users (id, name, email, passwordHash, role)
      VALUES (?, 'Terraland Admin', ?, ?, 'admin')
      ON CONFLICT(email) DO UPDATE SET
        name = excluded.name, passwordHash = excluded.passwordHash, role = 'admin'
    `).run(adminId, ADMIN_EMAIL, await hash(adminPassword, 12));
    user = { id: adminId, name: "Terraland Admin", email: ADMIN_EMAIL, role: "admin" };
  } else {
    const row = db.prepare("SELECT id, name, email, passwordHash, role FROM users WHERE email = ?").get(email) as
      { id: string; name: string; email: string; passwordHash: string; role: "user" | "admin" } | undefined;
    if (!row || !(await compare(password, row.passwordHash))) {
      return NextResponse.json({ error: "The email or password is incorrect." }, { status: 401 });
    }
    user = { id: row.id, name: row.name, email: row.email, role: row.role };
  }
  const token = startSession(user.id);
  const pendingEmail = action === "signup"
    ? db.prepare("SELECT COUNT(*) AS count FROM registration_notifications WHERE email = ? AND status = 'pending'").get(user.email) as { count: number }
    : { count: 0 };
  const response = NextResponse.json({ user, notificationPending: pendingEmail.count > 0 });
  response.cookies.set("landmark_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get("landmark_session")?.value;
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  const response = NextResponse.json({ message: "Signed out." });
  response.cookies.set("landmark_session", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
