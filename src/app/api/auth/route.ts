import { compare, hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, newId, startSession } from "@/lib/session";
import { deliverPendingRegistrationNotices } from "@/lib/notifications";

const ADMIN_EMAIL = "pavansai580@gmail.com";

export async function GET() {
  return NextResponse.json({ user: await currentUser() });
}

export async function PATCH(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const input = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const name = String(input.name ?? "").trim();
  const rawPhone = String(input.phone ?? "").trim().replace(/[\s()-]/g, "");
  const phone = /^\d{10}$/.test(rawPhone) ? `+91${rawPhone}` : rawPhone;
  const email = String(input.email ?? "").trim().toLowerCase();
  if (name.length < 2 || name.length > 80) return NextResponse.json({ error: "Enter your name (2–80 characters)." }, { status: 400 });
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return NextResponse.json({ error: "Enter a valid mobile number with country code, such as +91 98765 43210." }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address, or leave it blank." }, { status: 400 });
  if (email === ADMIN_EMAIL) return NextResponse.json({ error: "That email is reserved for the site administrator." }, { status: 409 });
  if (db.prepare("SELECT 1 FROM users WHERE phone = ? AND id != ?").get(phone, user.id)) return NextResponse.json({ error: "That phone number belongs to another account." }, { status: 409 });
  if (email && db.prepare("SELECT 1 FROM users WHERE email = ? AND id != ?").get(email, user.id)) return NextResponse.json({ error: "That email belongs to another account." }, { status: 409 });
  const storedEmail = email || ("phone-" + phone.slice(1) + "@phone.nilay.invalid");
  try {
    const updateProfile = db.transaction(() => {
      db.prepare("UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?").run(name, storedEmail, phone, user.id);
      db.prepare("UPDATE properties SET owner = ? WHERE ownerId = ?").run(name, user.id);
    });
    updateProfile();
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) return NextResponse.json({ error: "That email or phone number is already in use." }, { status: 409 });
    throw error;
  }
  return NextResponse.json({ message: "Profile saved.", user: { ...user, name, email, phone } });
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
  const identifier = String(input.identifier ?? input.email ?? "").trim();
  const password = String(input.password ?? "");
  const rawPhone = String(input.phone ?? "").trim().replace(/[\s()-]/g, "");
  const phone = /^\d{10}$/.test(rawPhone) ? `+91${rawPhone}` : rawPhone;
  if (!password.trim() || password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: "Enter a password of at least 8 characters." }, { status: 400 });
  }
  if (action === "signup" && (!/^(?:\+91)?[6-9]\d{9}$/.test(phone) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))) {
    return NextResponse.json({ error: "Enter a valid mobile number and, if you want password recovery, a valid email address." }, { status: 400 });
  }
  if (action === "signin" && !identifier) return NextResponse.json({ error: "Enter your registered phone number or email address." }, { status: 400 });
  let user: { id: string; name: string; email: string; phone: string; role: "user" | "admin" } | undefined;
  if (action === "signup") {
    const name = String(input.name ?? "").trim();
    if (name.length < 2 || name.length > 80) return NextResponse.json({ error: "Enter your name (2–80 characters)." }, { status: 400 });
    if (email === ADMIN_EMAIL) {
      return NextResponse.json({ error: "This email is reserved for the site administrator." }, { status: 409 });
    }
    if (db.prepare("SELECT 1 FROM users WHERE phone = ?").get(phone)) {
      return NextResponse.json({ error: "An account with this phone number already exists. Sign in with that number instead." }, { status: 409 });
    }
    if (email && db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    const id = newId();
    const notificationId = newId();
    const storedEmail = "phone-" + phone.slice(1) + "@phone.nilay.invalid";
    const passwordHash = await hash(password, 12);
    try {
      const createAccount = db.transaction(() => {
        db.prepare("INSERT INTO users (id, name, email, phone, passwordHash, role) VALUES (?, ?, ?, ?, ?, 'user')")
          .run(id, name, email || storedEmail, phone, passwordHash);
        if (email) db.prepare("INSERT INTO registration_notifications (id, name, email) VALUES (?, ?, ?)")
          .run(notificationId, name, email);
      });
      createAccount();
      user = { id, name, email, phone, role: "user" };
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }
      throw error;
    }
    if (email) await deliverPendingRegistrationNotices(notificationId);
  } else if (identifier.toLowerCase() === ADMIN_EMAIL) {
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
      VALUES (?, 'NILAY Admin', ?, ?, 'admin')
      ON CONFLICT(email) DO UPDATE SET
        name = excluded.name, passwordHash = excluded.passwordHash, role = 'admin'
    `).run(adminId, ADMIN_EMAIL, await hash(adminPassword, 12));
    user = { id: adminId, name: "NILAY Admin", email: ADMIN_EMAIL, phone: "", role: "admin" };
  } else {
    const isEmail = identifier.includes("@");
    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) return NextResponse.json({ error: "Enter a valid phone number or email address." }, { status: 400 });
    const normalizedPhone = identifier.replace(/[\s()-]/g, "");
    const canonicalPhone = /^\d{10}$/.test(normalizedPhone) ? `+91${normalizedPhone}` : normalizedPhone;
    if (!isEmail && !/^(?:\+91)?[6-9]\d{9}$/.test(canonicalPhone)) return NextResponse.json({ error: "Enter your 10-digit mobile number, with or without +91, or your email address." }, { status: 400 });
    const rows = (isEmail
      ? db.prepare("SELECT id, name, email, phone, passwordHash, role FROM users WHERE email = ?").all(identifier.toLowerCase())
      : db.prepare("SELECT id, name, email, phone, passwordHash, role FROM users WHERE phone = ?").all(canonicalPhone)) as
      { id: string; name: string; email: string; phone: string; passwordHash: string; role: "user" | "admin" }[];
    if (!isEmail && rows.length > 1) return NextResponse.json({ error: "This phone number is linked to multiple accounts. Sign in using email." }, { status: 409 });
    const row = rows[0];
    if (!row || !(await compare(password, row.passwordHash))) return NextResponse.json({ error: "The phone/email or password is incorrect." }, { status: 401 });
    user = { id: row.id, name: row.name, email: row.email.endsWith("@phone.nilay.invalid") ? "" : row.email, phone: row.phone, role: row.role };
  }
  const token = startSession(user.id);
  const pendingEmail = action === "signup" && user.email
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
