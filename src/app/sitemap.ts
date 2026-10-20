import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://terraland.in").replace(/\/+$/, "");
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const properties = db.prepare("SELECT id, createdAt FROM properties WHERE status = 'published'").all() as
    { id: string; createdAt: string }[];
  const publishedLocations = db.prepare(`
    SELECT city, locality, listingCategory, MAX(COALESCE(updatedAt, createdAt)) AS lastModified
    FROM properties WHERE status = 'published'
    GROUP BY city COLLATE NOCASE, locality COLLATE NOCASE, listingCategory
  `).all() as { city: string; locality: string; listingCategory: string; lastModified: string }[];
  const locationPages = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const item of publishedLocations) {
    const category = item.listingCategory === "rent" ? "rent" : "sale";
    for (const [key, value] of [["city", item.city], ["locality", item.locality]] as const) {
      const name = value.trim();
      if (!name) continue;
      const params = new URLSearchParams([[key, name]]);
      if (category === "rent") params.set("category", "rent");
      const url = `${siteUrl}/search?${params.toString()}`;
      locationPages.set(url, { url, lastModified: item.lastModified ? new Date(item.lastModified) : undefined, changeFrequency: "daily", priority: 0.75 });
    }
  }
  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/search`, changeFrequency: "daily", priority: 0.9 },
    ...["/about", "/contact", "/faq", "/guides", "/privacy", "/terms", "/lender-interest"].map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: "monthly" as const, priority: path === "/about" || path === "/guides" ? 0.7 : 0.4 })),
    ...["/services", "/services/dharani-title-check", "/services/legal-verification", "/services/ec-verification", "/services/stamp-duty-calculator", "/services/plot-loan-emi-calculator"].map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: "monthly" as const, priority: path === "/services" ? 0.8 : 0.6 })),
    ...locationPages.values(),
    ...properties.map((property) => ({
      url: `${siteUrl}/properties/${encodeURIComponent(property.id)}`,
      lastModified: new Date(property.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
