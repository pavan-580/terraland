import type { Metadata } from "next";
import { SearchResults } from "@/components/search-results";
import { rentalTypes } from "@/lib/market";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Explore land and plots for sale or rent",
  description: "Search land, residential plots, farm land, farm stays, and rentals across India. Filter listings by location, property type, and price on NILAY.",
};

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
  const searchKey = [initial.q, initial.city, initial.locality, initial.type, initial.category].join("\u0000");
  return <SearchResults key={searchKey} initial={initial} />;
}
