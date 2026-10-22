import { NextRequest, NextResponse } from "next/server";
import { db, getSiteSetting, logMemberActivity, publicPropertyFromRow } from "@/lib/db";
import { isGoogleMapsUrl, isListingCategory, parseListingArea } from "@/lib/market";
import { currentUser, newId } from "@/lib/session";
import { storePropertyPhotos, validateStoredPropertyPhotos, validateStoredPropertyVideos } from "@/lib/property-images";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendListingSubmissionNotice } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const user = await currentUser();
  const params = request.nextUrl.searchParams;
  const clauses = ["status = 'published'"];
  const values: (string | number)[] = [];
  const search = params.get("q")?.trim();
  const city = params.get("city")?.trim();
  const locality = params.get("locality")?.trim();
  const type = params.get("type")?.trim();
  const listingCategory = params.get("category")?.trim();
  const min = Number(params.get("min"));
  const max = Number(params.get("max"));
  const minArea = Number(params.get("minArea"));
  const maxArea = Number(params.get("maxArea"));
  const availability = params.get("availability")?.trim();
  const sort = params.get("sort")?.trim();

  if (search) {
    clauses.push("(title LIKE ? OR locality LIKE ? OR city LIKE ? OR type LIKE ? OR description LIKE ?)");
    const term = `%${search.slice(0, 80)}%`;
    values.push(term, term, term, term, term);
  }
  if (city) {
    clauses.push("(city LIKE ? OR locality LIKE ?)");
    values.push(`%${city.slice(0, 80)}%`, `%${city.slice(0, 80)}%`);
  }
  if (locality) {
    clauses.push("locality LIKE ?");
    values.push(`%${locality.slice(0, 80)}%`);
  }
  if (type) {
    clauses.push("REPLACE(LOWER(type), ' ', '') = REPLACE(LOWER(?), ' ', '')");
    values.push(type);
  }
  if (listingCategory && ["sale", "rent"].includes(listingCategory)) {
    clauses.push("listingCategory = ?");
    values.push(listingCategory);
  }
  if (Number.isFinite(min) && min > 0) {
    clauses.push("price >= ?");
    values.push(min);
  }
  if (Number.isFinite(max) && max > 0) {
    clauses.push("price <= ?");
    values.push(max);
  }
  if (Number.isFinite(minArea) && minArea > 0) {
    clauses.push("area >= ?");
    values.push(minArea);
  }
  if (Number.isFinite(maxArea) && maxArea > 0) {
    clauses.push("area <= ?");
    values.push(maxArea);
  }
  if (availability) {
    clauses.push("availability LIKE ?");
    values.push(`%${availability.slice(0, 80)}%`);
  }

  let orderBy = "properties.createdAt DESC, properties.rowid DESC";
  if (sort === "price_asc") {
    orderBy = "properties.price ASC, properties.createdAt DESC";
  } else if (sort === "price_desc") {
    orderBy = "properties.price DESC, properties.createdAt DESC";
  } else if (sort === "recent") {
    orderBy = "COALESCE(properties.updatedAt, properties.createdAt) DESC, properties.rowid DESC";
  } else if (sort === "area_asc") {
    orderBy = "properties.area ASC";
  } else if (sort === "area_desc") {
    orderBy = "properties.area DESC";
  }

  const rows = db.prepare(`
    SELECT properties.*, users.email AS sellerEmail FROM properties
    LEFT JOIN users ON users.id = properties.ownerId
    WHERE ${clauses.join(" AND ")}
    ORDER BY ${orderBy}
  `).all(...values) as Record<string, unknown>[];
  const showSellerPhones = getSiteSetting("showSellerPhones") !== "false" && Boolean(user);
  return NextResponse.json(rows.map((row) => {
    return publicPropertyFromRow(row, showSellerPhones);
  }), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(`property-submit:${ip}`, 5, 300);
  if (!rate.allowed) {
    return NextResponse.json({ error: `Too many submissions. Please wait ${rate.resetInSeconds} seconds before submitting again.` }, { status: 429 });
  }

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to publish a listing." }, { status: 401 });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Please send valid listing details." }, { status: 400 });
  const value = (key: string) => String(form.get(key) ?? "").trim();
  const fields = ["title", "type", "city", "locality", "unit", "description"] as const;
  if (fields.some((key) => !value(key))) {
    return NextResponse.json({ error: "Complete all required listing details." }, { status: 400 });
  }
  const price = Number(value("price"));
  const area = parseListingArea(value("area"));
  const listingCategory = value("listingCategory") || "sale";
  const pricePeriod = value("pricePeriod") || "total";
  const allowedPricePeriods: Record<string, string[]> = {
    sale: ["total"],
    rent: ["per-day", "per-night", "per-month", "per-event"],
  };
  const availability = value("availability");
  const guestCapacityInput = value("guestCapacity");
  const guestCapacity = guestCapacityInput ? Number(guestCapacityInput) : null;
  const sellerAuthority = value("sellerAuthority");
  const publicationConsented = form.get("publicationConsent") === "on";
  const contactConsented = form.get("contactConsent") === "on";
  const isNegotiable = ["negotiable", "slightly_negotiable", "fixed"].includes(value("isNegotiable")) ? value("isNegotiable") : "";
  const documentStatus = ["seller_declared", "docs_collected", "admin_reviewed"].includes(value("documentStatus")) ? value("documentStatus") : "seller_declared";
  const legalDisclaimerAgreed = 1;
  const updatedAt = new Date().toISOString();

  if (value("mapUrl").length > 500 || (value("mapUrl") !== "" && !isGoogleMapsUrl(value("mapUrl")))) {
    return NextResponse.json({ error: "Paste a valid HTTPS Google Maps link for this property." }, { status: 400 });
  }
  if (area === null) return NextResponse.json({ error: "Enter a positive land area. Commas are allowed, for example 58,741." }, { status: 400 });
  if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ error: "Enter a price greater than zero." }, { status: 400 });
  if (!/^\+[1-9]\d{7,14}$/.test(value("phone").replace(/[\s()-]/g, ""))) {
    return NextResponse.json({ error: "Enter a valid contact phone number." }, { status: 400 });
  }
  const choice = (key: string) => value(key);
  const choices = ["loanAvailable", "registrationAvailable", "cornerPlot", "clearTitle"];
  const amenities = [...new Set(form.getAll("amenities").map((item) => String(item).trim()).filter(Boolean))].slice(0, 40);
  if (value("title").length < 4 || value("title").length > 100 ||
    value("type").length > 60 || value("city").length > 80 || value("locality").length > 80 ||
    value("unit").length > 20 || value("description").length < 10 || value("description").length > 1500 ||
    value("facing").length > 40 || value("approvals").length > 120 || value("renovation").length > 120 ||
    value("roadWidth").length > 40 || value("surveyNumber").length > 80 || value("soilType").length > 80 ||
    value("address").length > 240 || value("landmark").length > 120 || amenities.join(", ").length > 2400 ||
    choices.some((key) => choice(key) && !["yes", "no"].includes(choice(key))) ||
    amenities.some((item) => item.length > 60) ||
    !isListingCategory(listingCategory) ||
    value("type").length < 2 ||
    !allowedPricePeriods[listingCategory]?.includes(pricePeriod) ||
    availability.length > 240 ||
    (guestCapacityInput && (!Number.isInteger(guestCapacity) || Number(guestCapacity) < 1 || Number(guestCapacity) > 1000))) {
    return NextResponse.json({ error: "Check the title, property type, location, description, and other required details." }, { status: 400 });
  }
  if (!["owner", "authorized_representative"].includes(sellerAuthority) || !publicationConsented || !contactConsented) {
    return NextResponse.json({ error: "Confirm your authority to list the property and give permission to publish it after review and contact you." }, { status: 400 });
  }
  const files = form.getAll("photos").filter((file): file is File => file instanceof File && file.size > 0);
  let images: string[];
  if (files.length) {
    try {
      images = await storePropertyPhotos(files);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Photos could not be saved." }, { status: 400 });
    }
  } else {
    let submittedImages: unknown;
    try {
      submittedImages = JSON.parse(value("photoUrls"));
    } catch {
      return NextResponse.json({ error: "Add at least one property photo." }, { status: 400 });
    }
    const validatedImages = await validateStoredPropertyPhotos(submittedImages);
    if (!validatedImages) return NextResponse.json({ error: "One or more uploaded photos are unavailable. Please upload them again." }, { status: 400 });
    images = validatedImages;
  }
  let submittedVideos: unknown = [];
  try {
    submittedVideos = JSON.parse(value("videoUrls") || "[]");
  } catch {
    return NextResponse.json({ error: "One or more uploaded videos are unavailable. Please upload them again." }, { status: 400 });
  }
  const videos = await validateStoredPropertyVideos(submittedVideos);
  if (!videos) return NextResponse.json({ error: "One or more uploaded videos are unavailable. Please upload them again." }, { status: 400 });
  const property = {
    id: newId(),
    title: value("title").slice(0, 100),
    type: value("type").slice(0, 60),
    listingCategory,
    pricePeriod,
    availability: listingCategory === "rent" ? availability : "",
    guestCapacity: listingCategory === "rent" ? guestCapacity : null,
    city: value("city").slice(0, 80),
    locality: value("locality").slice(0, 80),
    price: Math.round(price),
    area,
    unit: value("unit").slice(0, 20),
    image: images[0],
    images: JSON.stringify(images),
    videos: JSON.stringify(videos),
    ownerId: user.id,
    status: "pending",
    sellerAuthority,
    publicationConsentAt: new Date().toISOString(),
    contactConsentAt: new Date().toISOString(),
    badge: "New listing",
    description: value("description").slice(0, 1500),
    owner: user.name,
    phone: value("phone").trim().replace(/[\s()-]/g, ""),
    facing: value("facing").slice(0, 40),
    approvals: value("approvals").slice(0, 120),
    loanAvailable: choice("loanAvailable"),
    registrationAvailable: choice("registrationAvailable"),
    renovation: value("renovation").slice(0, 120),
    cornerPlot: choice("cornerPlot"),
    roadWidth: value("roadWidth").slice(0, 40),
    surveyNumber: value("surveyNumber").slice(0, 80),
    soilType: value("soilType").slice(0, 80),
    clearTitle: choice("clearTitle"),
    amenities: JSON.stringify(amenities),
    address: value("address").slice(0, 240),
    landmark: value("landmark").slice(0, 120),
    mapUrl: value("mapUrl").slice(0, 500),
    verified: 0,
    isNegotiable,
    documentStatus,
    legalDisclaimerAgreed,
    updatedAt,
  };
  db.prepare(`
    INSERT INTO properties
      (id, title, type, listingCategory, pricePeriod, availability, guestCapacity, city, locality, price, area, unit, image, images, videos, ownerId, status, sellerAuthority, publicationConsentAt, contactConsentAt, badge, description, owner, phone,
       facing, approvals, loanAvailable, registrationAvailable, renovation, cornerPlot, roadWidth, surveyNumber,
       soilType, clearTitle, amenities, address, landmark, mapUrl, verified, isNegotiable, documentStatus, legalDisclaimerAgreed, updatedAt)
    VALUES
      (@id, @title, @type, @listingCategory, @pricePeriod, @availability, @guestCapacity, @city, @locality, @price, @area, @unit, @image, @images, @videos, @ownerId, @status, @sellerAuthority, @publicationConsentAt, @contactConsentAt, @badge, @description, @owner, @phone,
       @facing, @approvals, @loanAvailable, @registrationAvailable, @renovation, @cornerPlot, @roadWidth, @surveyNumber,
       @soilType, @clearTitle, @amenities, @address, @landmark, @mapUrl, @verified, @isNegotiable, @documentStatus, @legalDisclaimerAgreed, @updatedAt)
  `).run(property);

  const leadId = newId();
  try {
    db.prepare(`
      INSERT INTO leads (id, type, referenceId, name, phone, email, status, source, notes, statusHistory, relatedPropertyIds)
      VALUES (?, 'seller', ?, ?, ?, ?, 'new', 'seller_submission', ?, ?, ?)
    `).run(
      leadId,
      property.id,
      user.name,
      property.phone,
      user.email,
      `Submitted plot for review: ${property.title} in ${property.locality}, ${property.city} (${property.area} ${property.unit}).`,
      JSON.stringify([{ status: "new", changedAt: new Date().toISOString(), note: "Seller submitted listing for review." }]),
      JSON.stringify([property.id])
    );
  } catch {
    // leads table fallback
  }

  logMemberActivity(user.id, "Listing submitted for review", `${property.listingCategory === "rent" ? "For rent" : "For sale"} · ${property.type} · ${property.area} ${property.unit}`, { id: property.id, title: property.title });
  db.prepare("UPDATE users SET phone = ? WHERE id = ?").run(property.phone, user.id);
  void sendListingSubmissionNotice({
    id: property.id,
    title: property.title,
    owner: property.owner,
    phone: property.phone,
    price: property.price,
    locality: property.locality,
    city: property.city,
    area: property.area,
    unit: property.unit,
    listingCategory: property.listingCategory,
    type: property.type,
  });
  return NextResponse.json({ ...property, images, videos, amenities, verified: false }, { status: 201 });
}
