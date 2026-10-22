import { NextRequest, NextResponse } from "next/server";
import { db, logMemberActivity } from "@/lib/db";
import { currentUser, newId } from "@/lib/session";
import { sendReviewSubmissionNotice } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const propertyId = request.nextUrl.searchParams.get("propertyId")?.trim() ?? "";
  if (!propertyId) return NextResponse.json({ error: "A listing is required to load reviews." }, { status: 400 });
  const reviews = db.prepare(`
    SELECT id, reviewerName, rating, comment, createdAt, updatedAt
    FROM property_reviews WHERE propertyId = ? ORDER BY createdAt DESC LIMIT 100
  `).all(propertyId);
  const user = await currentUser();
  const ownReview = user ? db.prepare(`
    SELECT id, reviewerName, rating, comment, createdAt, updatedAt
    FROM property_reviews WHERE propertyId = ? AND userId = ?
  `).get(propertyId, user.id) : null;
  return NextResponse.json({ reviews, ownReview, user: user ? { name: user.name } : null });
}

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to leave a review." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Please send a valid review." }, { status: 400 });
  const input = body as Record<string, unknown>;
  const propertyId = String(input.propertyId ?? "").trim();
  const comment = String(input.comment ?? "").trim();
  const rating = Number(input.rating);
  if (!propertyId || !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 5 || comment.length > 1000) {
    return NextResponse.json({ error: "Choose 1–5 stars and write a review between 5 and 1,000 characters." }, { status: 400 });
  }
  const property = db.prepare("SELECT id, title FROM properties WHERE id = ? AND status = 'published'").get(propertyId) as { id: string; title: string } | undefined;
  if (!property) return NextResponse.json({ error: "This listing is no longer available." }, { status: 404 });
  const priorReview = db.prepare("SELECT id FROM property_reviews WHERE propertyId = ? AND userId = ?").get(propertyId, user.id) as { id: string } | undefined;
  const id = priorReview?.id ?? newId();
  db.prepare(`
    INSERT INTO property_reviews (id, propertyId, userId, reviewerName, rating, comment, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(propertyId, userId) DO UPDATE SET
      reviewerName = excluded.reviewerName, rating = excluded.rating,
      comment = excluded.comment, updatedAt = CURRENT_TIMESTAMP
  `).run(id, propertyId, user.id, user.name, rating, comment);
  logMemberActivity(user.id, priorReview ? "Review updated" : "Review posted", `${rating}/5 rating.`, property);
  void sendReviewSubmissionNotice({
    propertyId,
    propertyTitle: property.title,
    reviewerName: user.name,
    rating,
    comment,
  });
  return NextResponse.json({ message: priorReview ? "Your review has been updated." : "Your review has been posted." }, { status: priorReview ? 200 : 201 });
}
