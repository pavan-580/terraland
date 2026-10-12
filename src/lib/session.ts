import "server-only";
import { cookies } from "next/headers";
import { randomBytes, randomUUID } from "node:crypto";
import { db } from "@/lib/db";

export async function currentUser() {
  const token = (await cookies()).get("landmark_session")?.value;
  if (!token) return null;
  return db.prepare(`
    SELECT users.id, users.name, users.email, users.phone, users.role
    FROM sessions JOIN users ON users.id = sessions.userId
    WHERE sessions.token = ? AND sessions.expiresAt > ?
  `).get(token, new Date().toISOString()) as { id: string; name: string; email: string; phone: string; role: "user" | "admin" } | undefined ?? null;
}

export function startSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  db.prepare("INSERT INTO sessions (token, userId, expiresAt) VALUES (?, ?, ?)").run(token, userId, expiresAt);
  return token;
}

export function newId() {
  return randomUUID();
}
