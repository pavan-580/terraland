import { NextRequest, NextResponse } from "next/server";
import { db, getSiteSetting, propertyFromRow, setSiteSetting } from "@/lib/db";
import { isGoogleMapsUrl, isListingCategory, parseListingArea } from "@/lib/market";
import { currentUser } from "@/lib/session";
import { deleteStoredPropertyFiles } from "@/lib/property-images";

async function requireAdmin() {
  const user = await currentUser();
  return user?.role === "admin" ? user : null;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const users = db.prepare(`
    SELECT users.id, users.name, CASE WHEN users.email LIKE '%@phone.nilay.invalid' THEN '' ELSE users.email END AS email, users.phone, users.createdAt,
      (SELECT COUNT(*) FROM properties WHERE properties.ownerId = users.id) AS listingCount
    FROM users ORDER BY users.createdAt DESC
  `).all();
  const properties = (db.prepare("SELECT * FROM properties ORDER BY createdAt DESC, rowid DESC").all() as Record<string, unknown>[])
    .map(propertyFromRow);
  const inquiries = db.prepare(`
    SELECT inquiries.id, inquiries.propertyId, inquiries.userId, inquiries.name, inquiries.email, inquiries.phone,
      inquiries.message, inquiries.createdAt, properties.title AS propertyTitle,
      inquiry_notifications.status AS emailStatus
    FROM inquiries JOIN properties ON properties.id = inquiries.propertyId
    LEFT JOIN inquiry_notifications ON inquiry_notifications.inquiryId = inquiries.id
    ORDER BY inquiries.createdAt DESC
  `).all();
  const inquiryNotifications = db.prepare(`
    SELECT inquiry_notifications.inquiryId AS id, inquiry_notifications.status, inquiry_notifications.attempts,
      inquiry_notifications.lastError, inquiry_notifications.createdAt, properties.title AS propertyTitle
    FROM inquiry_notifications
    JOIN inquiries ON inquiries.id = inquiry_notifications.inquiryId
    JOIN properties ON properties.id = inquiries.propertyId
    ORDER BY inquiry_notifications.createdAt DESC LIMIT 100
  `).all();
  const reviews = db.prepare(`
    SELECT property_reviews.id, property_reviews.propertyId, property_reviews.userId,
      property_reviews.reviewerName, property_reviews.rating, property_reviews.comment,
      property_reviews.createdAt, property_reviews.updatedAt, properties.title AS propertyTitle
    FROM property_reviews JOIN properties ON properties.id = property_reviews.propertyId
    ORDER BY property_reviews.createdAt DESC
  `).all();
  const phoneClicks = db.prepare(`
    SELECT seller_phone_clicks.id, seller_phone_clicks.propertyId, seller_phone_clicks.propertyTitle,
      seller_phone_clicks.sellerName, seller_phone_clicks.userId, seller_phone_clicks.userName,
      seller_phone_clicks.userPhone, seller_phone_clicks.visitorId, seller_phone_clicks.contactMethod,
      seller_phone_clicks.createdAt,
      visitor.id AS visitorProfileId,
      COALESCE(properties.ownerId, (
        SELECT MIN(matchedSeller.id) FROM users AS matchedSeller
        WHERE matchedSeller.name = seller_phone_clicks.sellerName COLLATE NOCASE
        HAVING COUNT(*) = 1
      )) AS sellerId
    FROM seller_phone_clicks
    LEFT JOIN properties ON properties.id = seller_phone_clicks.propertyId
    LEFT JOIN users AS visitor ON visitor.id = seller_phone_clicks.userId
    ORDER BY seller_phone_clicks.createdAt DESC, seller_phone_clicks.rowid DESC
    LIMIT 1000
  `).all();
  const memberActivity = db.prepare(`
    SELECT member_activity_log.id, member_activity_log.userId, member_activity_log.action,
      member_activity_log.details, member_activity_log.propertyId, member_activity_log.propertyTitle,
      member_activity_log.createdAt
    FROM member_activity_log JOIN users ON users.id = member_activity_log.userId
    ORDER BY member_activity_log.createdAt DESC, member_activity_log.rowid DESC
  `).all();
  const siteActivity = db.prepare(`
    SELECT site_activity_log.id, CASE WHEN users.id IS NULL THEN NULL ELSE site_activity_log.userId END AS userId,
      COALESCE(NULLIF(site_activity_log.actorName, ''), users.name, 'Guest visitor') AS actorName,
      site_activity_log.visitorId, site_activity_log.action, site_activity_log.details,
      site_activity_log.propertyId, site_activity_log.propertyTitle, site_activity_log.createdAt
    FROM site_activity_log LEFT JOIN users ON users.id = site_activity_log.userId
    ORDER BY site_activity_log.createdAt DESC, site_activity_log.rowid DESC
  `).all();
  const registrationNotifications = db.prepare(`
    SELECT id, name, email, status, attempts, lastError, createdAt, sentAt
    FROM registration_notifications ORDER BY createdAt DESC LIMIT 100
  `).all();
  const dailyVisits = db.prepare(`
    SELECT visitDate AS period, COUNT(*) AS visitors, SUM(pageViews) AS pageViews
    FROM visitor_daily_counts
    WHERE visitDate >= date('now', '+330 minutes', '-29 days')
    GROUP BY visitDate ORDER BY visitDate DESC
  `).all();
  const monthlyVisits = db.prepare(`
    SELECT substr(visitDate, 1, 7) AS period, COUNT(DISTINCT visitorId) AS visitors, SUM(pageViews) AS pageViews
    FROM visitor_daily_counts
    WHERE visitDate >= strftime('%Y-%m', date('now', '+330 minutes', 'start of month', '-11 months')) || '-01'
    GROUP BY substr(visitDate, 1, 7) ORDER BY period DESC
  `).all();
  return NextResponse.json({ users, properties, inquiries, reviews, phoneClicks, memberActivity, siteActivity, registrationNotifications, inquiryNotifications, visits: { daily: dailyVisits, monthly: monthlyVisits }, settings: { showSellerPhones: getSiteSetting("showSellerPhones") !== "false" } });
}

export async function POST(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Unknown admin action." }, { status: 400 });
  }
  const action = (body as Record<string, unknown>).action;
  const notifications = await import("@/lib/notifications");
  if (action === "retry-registration-emails") {
    return NextResponse.json(await notifications.deliverPendingRegistrationNotices());
  }
  if (action === "retry-inquiry-emails") {
    return NextResponse.json(await notifications.deliverPendingInquiryNotices());
  }
  return NextResponse.json({ error: "Unknown admin action." }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid update details." }, { status: 400 });
  const input = body as Record<string, unknown>;

  if (input.resource === "setting" && input.key === "showSellerPhones") {
    if (typeof input.value !== "boolean") return NextResponse.json({ error: "Choose whether seller phone numbers should be shown." }, { status: 400 });
    setSiteSetting("showSellerPhones", input.value ? "true" : "false");
    return NextResponse.json({ message: `Seller phone numbers are now ${input.value ? "visible" : "hidden"}.` });
  }

  if (input.resource === "property" && input.action === "dismiss-deletion") {
    const id = String(input.id ?? "");
    if (!id) return NextResponse.json({ error: "A listing ID is required." }, { status: 400 });
    const result = db.prepare("UPDATE properties SET deleteRequestedAt = NULL WHERE id = ? AND deleteRequestedAt IS NOT NULL").run(id);
    if (!result.changes) return NextResponse.json({ error: "No pending deletion request was found." }, { status: 404 });
    return NextResponse.json({ message: "Deletion request declined. The listing remains active." });
  }

  if (input.resource === "property" && input.action === "toggle-visibility") {
    const id = String(input.id ?? "");
    const visible = input.visible;
    if (!id || typeof visible !== "boolean") return NextResponse.json({ error: "Choose whether this listing should be visible." }, { status: 400 });
    const result = db.prepare("UPDATE properties SET status = ? WHERE id = ?").run(visible ? "published" : "hidden", id);
    if (!result.changes) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    return NextResponse.json({ message: `Listing is now ${visible ? "visible on the website" : "hidden from the website"}.` });
  }

  if (input.resource === "property" && input.action === "toggle-phone-visibility") {
    const id = String(input.id ?? "");
    const visible = input.visible;
    if (!id || typeof visible !== "boolean") return NextResponse.json({ error: "Choose whether this listing's phone number should be visible." }, { status: 400 });
    const result = db.prepare("UPDATE properties SET showPhone = ? WHERE id = ?").run(Number(visible), id);
    if (!result.changes) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    return NextResponse.json({ message: `This listing's phone number is now ${visible ? "visible" : "hidden"}.` });
  }

  if (input.resource === "user") {
    const id = String(input.id ?? "");
    const name = String(input.name ?? "").trim();
    const email = String(input.email ?? "").trim().toLowerCase();
    const phoneRow = db.prepare("SELECT phone FROM users WHERE id = ? AND role != 'admin'").get(id) as { phone: string } | undefined;
    const storedEmail = email || ("phone-" + (phoneRow?.phone ?? "").replace(/\D/g, "") + "@phone.nilay.invalid");
    if (!id || name.length < 2 || name.length > 80 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || email === "pavansai580@gmail.com" || (!email && !phoneRow?.phone)) {
      return NextResponse.json({ error: "Enter a valid name and email, or keep the member's phone number for phone-only sign-in." }, { status: 400 });
    }
    try {
      const updateUser = db.transaction(() => {
        const result = db.prepare("UPDATE users SET name = ?, email = ? WHERE id = ? AND role != 'admin'").run(name, storedEmail, id);
        if (!result.changes) return false;
        db.prepare("UPDATE properties SET owner = ? WHERE ownerId = ?").run(name, id);
        return true;
      });
      if (!updateUser()) return NextResponse.json({ error: "User not found or cannot be edited." }, { status: 404 });
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
        return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json({ message: "User updated." });
  }

  if (input.resource === "property") {
    const id = String(input.id ?? "");
    const title = String(input.title ?? "").trim();
    const city = String(input.city ?? "").trim();
    const locality = String(input.locality ?? "").trim();
    const owner = String(input.owner ?? "").trim();
    const phone = String(input.phone ?? "").trim();
    const description = String(input.description ?? "").trim();
    const price = Number(input.price);
    const area = parseListingArea(input.area);
    const images = Array.isArray(input.images)
      ? input.images.filter((image): image is string => typeof image === "string").map((image) => image.trim()).filter(Boolean)
      : [];
    const videos = Array.isArray(input.videos)
      ? input.videos.filter((video): video is string => typeof video === "string").map((video) => video.trim()).filter(Boolean)
      : [];
    const status = input.status === "hidden" ? "hidden" : input.status === "published" ? "published" : "";
    const type = String(input.type ?? "").trim();
    const listingCategory = String(input.listingCategory ?? "");
    const pricePeriod = String(input.pricePeriod ?? "").trim();
    const allowedPricePeriods: Record<string, string[]> = {
      sale: ["total"],
      rent: ["per-day", "per-night", "per-month", "per-event"],
    };
    const availability = typeof input.availability === "string" ? input.availability.trim() : "";
    const guestCapacityInput = input.guestCapacity === null || input.guestCapacity === undefined
      ? "" : String(input.guestCapacity).trim();
    const guestCapacity = guestCapacityInput ? Number(guestCapacityInput) : null;
    const unit = String(input.unit ?? "").trim();
    const badge = String(input.badge ?? "").trim();
    const verified = input.verified === true ? 1 : input.verified === false ? 0 : -1;
    const detailText = (key: string) => typeof input[key] === "string" ? input[key].trim() : "";
    const detailChoices = ["loanAvailable", "registrationAvailable", "cornerPlot", "clearTitle"] as const;
    const detailAmenities = Array.isArray(input.amenities)
      ? input.amenities.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 40)
      : [];
    if (area === null) return NextResponse.json({ error: "Enter a positive land area. Commas are allowed, for example 58,741." }, { status: 400 });
    if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ error: "Enter a price greater than zero." }, { status: 400 });
    const choiceIsInvalid = detailChoices.some((key) => detailText(key) && !["yes", "no"].includes(detailText(key)));
    if (detailText("mapUrl").length > 500 ||
      (detailText("mapUrl") !== "" && !isGoogleMapsUrl(detailText("mapUrl")))) {
      return NextResponse.json({ error: "Paste a valid HTTPS Google Maps link for this property." }, { status: 400 });
    }
    if (!id || title.length < 4 || title.length > 100 || city.length < 2 || city.length > 80 ||
      locality.length < 2 || locality.length > 80 || owner.length < 2 || owner.length > 80 ||
      !/^[+()\d\s-]{8,24}$/.test(phone) || description.length < 10 || description.length > 1500 ||
      !isListingCategory(listingCategory) ||
      !allowedPricePeriods[listingCategory]?.includes(pricePeriod) ||
      availability.length > 240 ||
      (guestCapacityInput && (!Number.isInteger(guestCapacity) || Number(guestCapacity) < 1 || Number(guestCapacity) > 1000)) ||
      !status || !type || type.length > 60 ||
      !unit || unit.length > 20 || !badge || badge.length > 60 || verified < 0 ||
      detailText("facing").length > 40 || detailText("approvals").length > 120 || detailText("renovation").length > 120 ||
      detailText("roadWidth").length > 40 || detailText("surveyNumber").length > 80 || detailText("soilType").length > 80 ||
      detailText("address").length > 240 || detailText("landmark").length > 120 || choiceIsInvalid ||
      detailAmenities.some((amenity) => amenity.length > 60) ||
      [...images, ...videos].some((media) => !/^https?:\/\//i.test(media) && !/^\/uploads\/[a-zA-Z0-9._-]+$/.test(media))) {
      return NextResponse.json({ error: "Check the listing details, status, and photo URLs." }, { status: 400 });
    }
    const priorMedia = db.prepare("SELECT image, images, videos FROM properties WHERE id = ?").get(id) as
      { image: string; images: string; videos: string } | undefined;
    const parseMedia = (value: string | undefined) => {
      try {
        const parsed: unknown = JSON.parse(value ?? "[]");
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
      } catch {
        return [];
      }
    };
    const retainedMedia = new Set([...images, ...videos]);
    const removedMedia = [...new Set([
      ...parseMedia(priorMedia?.images), ...(priorMedia?.image ? [priorMedia.image] : []), ...parseMedia(priorMedia?.videos),
    ].filter((media) => !retainedMedia.has(media)))];
    const result = db.prepare(`
      UPDATE properties SET title = ?, city = ?, locality = ?, owner = ?, phone = ?,
        description = ?, price = ?, area = ?, images = ?, image = ?, videos = ?, status = ?,
        type = ?, listingCategory = ?, pricePeriod = ?, availability = ?, guestCapacity = ?, unit = ?, badge = ?, verified = ?, facing = ?, approvals = ?,
        loanAvailable = ?, registrationAvailable = ?, renovation = ?, cornerPlot = ?,
        roadWidth = ?, surveyNumber = ?, soilType = ?, clearTitle = ?, amenities = ?, address = ?, landmark = ?, mapUrl = ?
      WHERE id = ?
    `).run(title, city, locality, owner, phone, description, Math.round(price), area,
      JSON.stringify(images), images[0] ?? "", JSON.stringify(videos), status, type, listingCategory, pricePeriod,
      listingCategory === "rent" ? availability : "", listingCategory === "rent" ? guestCapacity : null, unit, badge, verified,
      detailText("facing"), detailText("approvals"), detailText("loanAvailable"), detailText("registrationAvailable"),
      detailText("renovation"), detailText("cornerPlot"), detailText("roadWidth"), detailText("surveyNumber"),
      detailText("soilType"), detailText("clearTitle"), JSON.stringify(detailAmenities), detailText("address"),
      detailText("landmark"), detailText("mapUrl"), id);
    if (!result.changes) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    const referencedRows = db.prepare("SELECT image, images, videos FROM properties WHERE id != ?").all(id) as
      { image: string; images: string; videos: string }[];
    const stillReferenced = new Set(referencedRows.flatMap((row) => [
      row.image, ...parseMedia(row.images), ...parseMedia(row.videos),
    ]));
    await deleteStoredPropertyFiles(removedMedia.filter((media) => !stillReferenced.has(media)));
    return NextResponse.json({ message: "Listing updated." });
  }

  return NextResponse.json({ error: "Unknown update type." }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid delete request." }, { status: 400 });
  const input = body as Record<string, unknown>;
  const id = String(input.id ?? "");
  if (!id) return NextResponse.json({ error: "A record ID is required." }, { status: 400 });
  let result;
  if (input.resource === "user") {
    result = db.prepare("DELETE FROM users WHERE id = ? AND role != 'admin'").run(id);
  } else if (input.resource === "property") {
    result = db.prepare("DELETE FROM properties WHERE id = ?").run(id);
  } else if (input.resource === "inquiry") {
    result = db.prepare("DELETE FROM inquiries WHERE id = ?").run(id);
  } else if (input.resource === "review") {
    result = db.prepare("DELETE FROM property_reviews WHERE id = ?").run(id);
  } else if (input.resource === "lender-interest") {
    result = db.prepare("DELETE FROM lender_interests WHERE id = ?").run(id);
  } else {
    return NextResponse.json({ error: "Unknown record type." }, { status: 400 });
  }
  if (!result.changes) return NextResponse.json({ error: "Record not found or cannot be deleted." }, { status: 404 });
  return NextResponse.json({ message: "Record deleted." });
}
