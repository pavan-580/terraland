import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MyListings } from "@/components/my-listings";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Manage your listings", robots: { index: false, follow: false } };

export default async function MyListingsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=%2Fmy-listings");
  return <><SiteHeader /><main className="saved-page my-listings-page">
    <span className="eyebrow">YOUR PROPERTIES</span>
    <h1>Manage your <em>land listings.</em></h1>
    <p>Update your property details and photos. Only you can edit your listings.</p>
    <MyListings />
  </main><SiteFooter /></>;
}
