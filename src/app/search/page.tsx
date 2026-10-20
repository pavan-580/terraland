import type { Metadata } from "next";
import { SearchResults } from "@/components/search-results";
import { rentalTypes } from "@/lib/market";
import { db, getSiteSetting, publicPropertyFromRow } from "@/lib/db";
import { currentUser } from "@/lib/session";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://terraland.in").replace(/\/+$/, "");
const knownLocations = new Set(["hyderabad", "vijayawada", "visakhapatnam", "kakinada", "tirupati", "guntur", "miyapur", "bachupally", "ameenpur", "chandanagar", "nizampet", "tellapur"]);
const statesByLocation: Record<string, string> = {
  hyderabad: "Telangana", miyapur: "Telangana", bachupally: "Telangana", ameenpur: "Telangana", chandanagar: "Telangana", nizampet: "Telangana", tellapur: "Telangana",
  vijayawada: "Andhra Pradesh", visakhapatnam: "Andhra Pradesh", kakinada: "Andhra Pradesh", tirupati: "Andhra Pradesh", guntur: "Andhra Pradesh",
};

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const params = await searchParams;
  const city = typeof params.city === "string" ? params.city.trim() : "";
  const locality = typeof params.locality === "string" ? params.locality.trim() : "";
  const location = locality || city;
  const category = params.category === "rent" ? "for rent" : "for sale";
  const state = location ? statesByLocation[location.toLocaleLowerCase("en-IN")] : "";
  const title = location ? `Residential plots ${category} in ${location}${state ? `, ${state}` : ""}` : "Explore land and plots for sale or rent in Telangana and Andhra Pradesh";
  const description = location
    ? `Browse published land and residential plot listings ${category} in ${location}${state ? `, ${state}` : ""}. Compare location, area, asking price, photos, and contact details on NILAY.`
    : "Search published residential plots, land, farm stays, and rentals across Telangana and Andhra Pradesh. Compare listing details and contact owners through NILAY.";
  const canonicalParams = new URLSearchParams();
  const publishedLocationExists = location ? Boolean(db.prepare("SELECT 1 FROM properties WHERE status = 'published' AND (city = ? COLLATE NOCASE OR locality = ? COLLATE NOCASE) LIMIT 1").get(location, location)) : false;
  if (location && (knownLocations.has(location.toLocaleLowerCase("en-IN")) || publishedLocationExists)) {
    canonicalParams.set(locality ? "locality" : "city", location);
    if (params.category === "rent") canonicalParams.set("category", "rent");
  }
  const canonical = canonicalParams.size ? `/search?${canonicalParams.toString()}` : "/search";
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: `${siteUrl}${canonical}`, siteName: "NILAY", locale: "en_IN", type: "website" },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const requestedType = typeof params.type === "string" ? params.type.replace(/\s/g, "").toLowerCase() : "";
  const requestedTypeCategory = requestedType ? db.prepare("SELECT listingCategory FROM properties WHERE status = 'published' AND REPLACE(LOWER(type), ' ', '') = ? ORDER BY createdAt DESC LIMIT 1").get(requestedType) as { listingCategory: string } | undefined : undefined;
  const requestedTypeIsRental = rentalTypes.some((type) => type.replace(/\s/g, "").toLowerCase() === requestedType) || requestedTypeCategory?.listingCategory === "rent";
  const initial = {
    q: typeof params.q === "string" ? params.q : "",
    city: typeof params.city === "string" ? params.city : "",
    locality: typeof params.locality === "string" ? params.locality : "",
    type: typeof params.type === "string" ? params.type : "",
    category: params.category === "rent" || params.category === "sale"
      ? params.category
      : requestedTypeIsRental ? "rent" : "sale",
  };

  // Render real listing links and text in the initial HTML so crawlers can discover them without running client JavaScript.
  const clauses = ["properties.status = 'published'", "properties.listingCategory = ?"];
  const values: string[] = [initial.category];
  if (initial.q.trim()) {
    clauses.push("(properties.title LIKE ? OR properties.locality LIKE ? OR properties.city LIKE ? OR properties.type LIKE ? OR properties.description LIKE ?)");
    const term = `%${initial.q.trim().slice(0, 80)}%`;
    values.push(term, term, term, term, term);
  }
  if (initial.city.trim()) {
    clauses.push("(properties.city LIKE ? OR properties.locality LIKE ?)");
    const term = `%${initial.city.trim().slice(0, 80)}%`;
    values.push(term, term);
  }
  if (initial.locality.trim()) {
    clauses.push("properties.locality LIKE ?");
    values.push(`%${initial.locality.trim().slice(0, 80)}%`);
  }
  if (initial.type.trim()) {
    clauses.push("REPLACE(LOWER(properties.type), ' ', '') = REPLACE(LOWER(?), ' ', '')");
    values.push(initial.type.trim());
  }
  const rows = db.prepare(`SELECT properties.*, users.email AS sellerEmail FROM properties LEFT JOIN users ON users.id = properties.ownerId WHERE ${clauses.join(" AND ")} ORDER BY COALESCE(properties.updatedAt, properties.createdAt) DESC, properties.rowid DESC LIMIT 80`).all(...values) as Record<string, unknown>[];
  const user = await currentUser();
  const initialProperties = rows.map((row) => publicPropertyFromRow(row, getSiteSetting("showSellerPhones") !== "false" && Boolean(user)));
  const searchKey = [initial.q, initial.city, initial.locality, initial.type, initial.category].join("\u0000");
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${initial.locality || initial.city || "Telangana"} plots ${initial.category === "rent" ? "for rent" : "for sale"}`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: initialProperties.map((property, index) => ({ "@type": "ListItem", position: index + 1, url: `${siteUrl}/properties/${encodeURIComponent(property.id)}`, name: property.title })),
    },
  };

  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema).replace(/</g, "\\u003c") }} /><SearchResults key={searchKey} initial={initial} initialProperties={initialProperties} /></>;
}
