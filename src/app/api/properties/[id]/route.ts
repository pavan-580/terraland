import { NextRequest, NextResponse } from "next/server";
import { db, getSiteSetting, publicPropertyFromRow } from "@/lib/db";
import { isGoogleMapsUrl, isListingCategory, parseListingArea } from "@/lib/market";
import { currentUser } from "@/lib/session";
import { storePropertyPhotos, storePropertyVideos, validateStoredPropertyPhotos, validateStoredPropertyVideos } from "@/lib/property-images";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  const { id } = await params;
  const row = db.prepare("SELECT properties.*, users.email AS sellerEmail FROM properties LEFT JOIN users ON users.id = properties.ownerId WHERE properties.id = ? AND properties.status = 'published'").get(id) as Record<string, unknown> | undefined;
  if (!row) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  const property = publicPropertyFromRow(row, getSiteSetting("showSellerPhones") !== "false" && Boolean(user));
  return NextResponse.json(property, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to edit your listings." }, { status: 401 });
  const { id } = await params;
  const row = db.prepare("SELECT * FROM properties WHERE id = ? AND ownerId = ?").get(id, user.id) as Record<string, unknown> | undefined;
  if (!row) return NextResponse.json({ error: "Listing not found or you do not own it." }, { status: 404 });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Please send valid listing details." }, { status: 400 });
  const value = (key: string) => String(form.get(key) ?? "").trim();
  const title = value("title");
  const type = value("type");
  const city = value("city");
  const locality = value("locality");
  const unit = value("unit");
  const description = value("description");
  const phone = value("phone");
  const price = Number(value("price"));
  const area = parseListingArea(value("area"));
  const listingCategory = value("listingCategory") || String(row.listingCategory ?? "sale");
  const pricePeriod = value("pricePeriod") || String(row.pricePeriod ?? "total");
  const availability = form.has("availability") ? value("availability") : String(row.availability ?? "");
  const guestCapacityInput = form.has("guestCapacity") ? value("guestCapacity") : String(row.guestCapacity ?? "");
  const guestCapacity = guestCapacityInput ? Number(guestCapacityInput) : null;
  const allowedPricePeriods: Record<string, string[]> = {
    sale: ["total"],
    rent: ["per-day", "per-night", "per-month", "per-event"],
  };
  if (value("mapUrl").length > 500 || (value("mapUrl") !== "" && !isGoogleMapsUrl(value("mapUrl")))) {
    return NextResponse.json({ error: "Paste a valid HTTPS Google Maps link for this property." }, { status: 400 });
  }
  if (area === null) return NextResponse.json({ error: "Enter a positive land area. Commas are allowed, for example 58,741." }, { status: 400 });
  if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ error: "Enter a price greater than zero." }, { status: 400 });
  if (!/^[+()\d\s-]{8,24}$/.test(phone)) return NextResponse.json({ error: "Enter a valid contact phone number." }, { status: 400 });
  const choice = (key: string) => value(key);
  const choices = ["loanAvailable", "registrationAvailable", "cornerPlot", "clearTitle"];
  const amenities = [...new Set(form.getAll("amenities").map((item) => String(item).trim()).filter(Boolean))].slice(0, 40);
  if (title.length < 4 || title.length > 100 || type.length < 2 || type.length > 60 ||
    city.length < 2 || city.length > 80 || locality.length < 2 || locality.length > 80 ||
    unit.length < 1 || unit.length > 20 || description.length < 10 || description.length > 1500 ||
    value("facing").length > 40 || value("approvals").length > 120 || value("renovation").length > 120 ||
    value("roadWidth").length > 40 || value("surveyNumber").length > 80 || value("soilType").length > 80 ||
    value("address").length > 240 || value("landmark").length > 120 || amenities.join(", ").length > 2400 ||
    choices.some((key) => choice(key) && !["yes", "no"].includes(choice(key))) ||
    amenities.some((item) => item.length > 60) ||
    !isListingCategory(listingCategory) ||
    !allowedPricePeriods[listingCategory]?.includes(pricePeriod) ||
    availability.length > 240 ||
    (guestCapacityInput && (!Number.isInteger(guestCapacity) || Number(guestCapacity) < 1 || Number(guestCapacity) > 1000))) {
    return NextResponse.json({ error: "Check the title, property type, location, description, and other required details." }, { status: 400 });
  }
  const files = form.getAll("photos").filter((file): file is File => file instanceof File && file.size > 0);
  let images: string[] = [];
  if (files.length) {
    try {
      images = await storePropertyPhotos(files);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Photos could not be saved." }, { status: 400 });
    }
  } else if (form.has("photoUrls")) {
    let submittedImages: unknown;
    try {
      submittedImages = JSON.parse(value("photoUrls"));
    } catch {
      return NextResponse.json({ error: "One or more uploaded photos are unavailable. Please upload them again." }, { status: 400 });
    }
    const validatedImages = await validateStoredPropertyPhotos(submittedImages);
    if (!validatedImages) return NextResponse.json({ error: "One or more uploaded photos are unavailable. Please upload them again." }, { status: 400 });
    images = validatedImages;
  } else if (typeof row.images === "string") {
    try {
      const parsed: unknown = JSON.parse(row.images);
      if (Array.isArray(parsed)) images = parsed.filter((image): image is string => typeof image === "string");
    } catch {
      images = [];
    }
  }
  const existingImages = typeof row.images === "string" ? (() => { try { const parsed: unknown = JSON.parse(row.images as string); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; } catch { return []; } })() : [];
  if (!existingImages.length && typeof row.image === "string" && row.image) existingImages.push(row.image);
  const requestedImages: unknown = form.has("removeImages") ? JSON.parse(value("removeImages") || "[]") : [];
  if (!Array.isArray(requestedImages) || requestedImages.some((item) => typeof item !== "string")) return NextResponse.json({ error: "Invalid photo removal request." }, { status: 400 });
  const removedImages = requestedImages.filter((item): item is string => existingImages.includes(item));
  images = images.filter((image) => !removedImages.includes(image));
  if (!images.length && typeof row.image === "string" && row.image && !removedImages.includes(row.image)) images = [row.image];
  if (!images.length) return NextResponse.json({ error: "Keep at least one property photo in your listing." }, { status: 400 });
  if (!images.length) return NextResponse.json({ error: "Upload at least one listing photo." }, { status: 400 });

  const videoFiles = form.getAll("videos").filter((file): file is File => file instanceof File && file.size > 0);
  let videos: string[] = [];
  if (videoFiles.length) {
    try {
      videos = await storePropertyVideos(videoFiles);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Videos could not be saved." }, { status: 400 });
    }
  } else if (form.has("videoUrls")) {
    let submittedVideos: unknown;
    try {
      submittedVideos = JSON.parse(value("videoUrls"));
    } catch {
      return NextResponse.json({ error: "One or more uploaded videos are unavailable. Please upload them again." }, { status: 400 });
    }
    const validatedVideos = await validateStoredPropertyVideos(submittedVideos);
    if (!validatedVideos) return NextResponse.json({ error: "One or more uploaded videos are unavailable. Please upload them again." }, { status: 400 });
    videos = validatedVideos;
  } else if (typeof row.videos === "string") {
    try {
      const parsed: unknown = JSON.parse(row.videos);
      if (Array.isArray(parsed)) videos = parsed.filter((video): video is string => typeof video === "string");
    } catch {
      videos = [];
    }
  }
  const existingVideos = typeof row.videos === "string" ? (() => { try { const parsed: unknown = JSON.parse(row.videos as string); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; } catch { return []; } })() : [];
  const requestedVideos: unknown = form.has("removeVideos") ? JSON.parse(value("removeVideos") || "[]") : [];
  if (!Array.isArray(requestedVideos) || requestedVideos.some((item) => typeof item !== "string")) return NextResponse.json({ error: "Invalid video removal request." }, { status: 400 });
  const removedVideos = requestedVideos.filter((item): item is string => existingVideos.includes(item));
  videos = videos.filter((video) => !removedVideos.includes(video));

  db.prepare(`
    UPDATE properties SET title = ?, type = ?, listingCategory = ?, pricePeriod = ?, availability = ?, guestCapacity = ?, city = ?, locality = ?, price = ?, area = ?, unit = ?,
      description = ?, phone = ?, images = ?, image = ?, videos = ?, owner = ?, facing = ?, approvals = ?,
      loanAvailable = ?, registrationAvailable = ?, renovation = ?, cornerPlot = ?, roadWidth = ?,
      surveyNumber = ?, soilType = ?, clearTitle = ?, amenities = ?, address = ?, landmark = ?, mapUrl = ?
    WHERE id = ? AND ownerId = ?
  `).run(
    title, type, listingCategory, pricePeriod, listingCategory === "rent" ? availability : "",
    listingCategory === "rent" ? guestCapacity : null, city, locality, Math.round(price), area, unit, description, phone,
    JSON.stringify(images), images[0], JSON.stringify(videos), user.name,
    value("facing").slice(0, 40), value("approvals").slice(0, 120), choice("loanAvailable"),
    choice("registrationAvailable"), value("renovation").slice(0, 120), choice("cornerPlot"),
    value("roadWidth").slice(0, 40), value("surveyNumber").slice(0, 80), value("soilType").slice(0, 80),
    choice("clearTitle"), JSON.stringify(amenities), value("address").slice(0, 240), value("landmark").slice(0, 120),
    value("mapUrl").slice(0, 500), id, user.id,
  );
  return NextResponse.json({ message: "Your listing has been updated." });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to delete your listing." }, { status: 401 });
  const { id } = await params;
  const result = db.prepare(`
    UPDATE properties SET deleteRequestedAt = CURRENT_TIMESTAMP
    WHERE id = ? AND ownerId = ? AND deleteRequestedAt IS NULL
  `).run(id, user.id);
  if (!result.changes) {
    const existing = db.prepare("SELECT deleteRequestedAt FROM properties WHERE id = ? AND ownerId = ?").get(id, user.id) as { deleteRequestedAt: string | null } | undefined;
    if (!existing) return NextResponse.json({ error: "Listing not found or you do not own it." }, { status: 404 });
    return NextResponse.json({ message: "Your deletion request is already awaiting administrator approval." });
  }
  return NextResponse.json({ message: "Deletion request sent. Your listing will remain visible until an administrator approves it." });
}
