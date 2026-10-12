import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://terraland.in";
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const properties = db.prepare("SELECT id, createdAt FROM properties WHERE status = 'published'").all() as
    { id: string; createdAt: string }[];
  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/search`, changeFrequency: "daily", priority: 0.9 },
    ...["/services", "/services/dharani-title-check", "/services/legal-verification", "/services/ec-verification", "/services/stamp-duty-calculator", "/services/plot-loan-emi-calculator"].map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: "monthly" as const, priority: path === "/services" ? 0.8 : 0.6 })),
    ...properties.map((property) => ({
      url: `${siteUrl}/properties/${encodeURIComponent(property.id)}`,
      lastModified: new Date(property.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
