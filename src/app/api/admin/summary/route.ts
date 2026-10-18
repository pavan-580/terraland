import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

async function requireAdmin() {
  const user = await currentUser();
  return user?.role === "admin" ? user : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  // Pending seller properties awaiting verification
  const pendingPropertiesCount = (db.prepare(`
    SELECT COUNT(*) AS count FROM properties WHERE verified = 0 OR status = 'draft'
  `).get() as { count: number }).count;

  // New buyer inquiries (last 48 hours)
  const recentInquiriesCount = (db.prepare(`
    SELECT COUNT(*) AS count FROM inquiries
    WHERE datetime(createdAt) > datetime('now', '-48 hours')
  `).get() as { count: number }).count;

  // Total active leads
  const activeLeadsCount = (db.prepare(`
    SELECT COUNT(*) AS count FROM leads
    WHERE status NOT IN ('closed_lost', 'on_hold')
  `).get() as { count: number }).count;

  // Follow-ups due today or overdue
  const todayDate = new Date().toISOString().slice(0, 10);
  const followUpsDue = db.prepare(`
    SELECT id, name, phone, type, nextFollowUpDate, notes, status
    FROM leads
    WHERE nextFollowUpDate IS NOT NULL AND nextFollowUpDate <= ?
      AND status NOT IN ('closed_lost', 'on_hold')
    ORDER BY nextFollowUpDate ASC LIMIT 10
  `).all(todayDate);

  // Scheduled site visits this week
  const upcomingVisits = db.prepare(`
    SELECT sv.id, sv.buyerName, sv.buyerPhone, sv.proposedDate, sv.proposedTime, sv.confirmationStatus,
           p.title AS propertyTitle, p.locality
    FROM site_visits sv
    JOIN properties p ON p.id = sv.propertyId
    WHERE sv.proposedDate >= ? AND sv.confirmationStatus != 'cancelled'
    ORDER BY sv.proposedDate ASC LIMIT 10
  `).all(todayDate);

  // Unreviewed transparent matches
  const pendingMatchesCount = (db.prepare(`
    SELECT COUNT(*) AS count FROM property_matches WHERE status = 'pending_review'
  `).get() as { count: number }).count;

  // Total published listings
  const publishedListingsCount = (db.prepare(`
    SELECT COUNT(*) AS count FROM properties WHERE status = 'published' AND verified = 1
  `).get() as { count: number }).count;

  return NextResponse.json({
    summary: {
      pendingPropertiesCount,
      recentInquiriesCount,
      activeLeadsCount,
      pendingMatchesCount,
      publishedListingsCount,
      followUpsDueCount: followUpsDue.length,
      upcomingVisitsCount: upcomingVisits.length,
      followUpsDue,
      upcomingVisits
    }
  });
}

