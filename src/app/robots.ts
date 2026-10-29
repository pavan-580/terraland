import type { MetadataRoute } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nkart.store").replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/sign-in", "/saved", "/profile", "/my-listings", "/sell"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
