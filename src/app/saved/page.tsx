import type { Metadata } from "next";
import { SavedListings } from "@/components/saved-listings";

export const metadata: Metadata = { title: "Your saved places" };

export default function SavedPage() { return <SavedListings />; }
