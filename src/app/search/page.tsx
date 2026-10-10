import type { Metadata } from "next";
import { SearchResults } from "@/components/search-results";
import { rentalTypes } from "@/lib/market";

export const metadata: Metadata = { title: "Explore land & plots" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const requestedType = typeof params.type === "string" ? params.type.replace(/\s/g, "").toLowerCase() : "";
  const requestedTypeIsRental = rentalTypes.some((type) => type.replace(/\s/g, "").toLowerCase() === requestedType);
  const initial = {
    q: typeof params.q === "string" ? params.q : "",
    city: typeof params.city === "string" ? params.city : "",
    type: typeof params.type === "string" ? params.type : "",
    category: params.category === "rent" || params.category === "sale"
      ? params.category
      : requestedTypeIsRental ? "rent" : "sale",
  };
  const searchKey = [initial.q, initial.city, initial.type, initial.category].join("\u0000");
  return <SearchResults key={searchKey} initial={initial} />;
}
