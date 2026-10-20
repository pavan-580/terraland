import type { Metadata } from "next";
import { SavedListings } from "@/components/saved-listings";

export const metadata: Metadata = { title: "Your saved places", robots: { index: false, follow: false } };

export default function SavedPage() { return <SavedListings />; }
