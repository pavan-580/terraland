import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MyListings } from "@/components/my-listings";
import { ProfilePanel } from "@/components/profile-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Your NILAY profile", robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=%2Fprofile");
  return <><SiteHeader /><main className="saved-page my-listings-page profile-page">
    <span className="eyebrow">YOUR NILAY ACCOUNT</span>
    <h1>Your NILAY account</h1>
    <p>Update your account details and manage the listings connected to your account.</p>
    <ProfilePanel user={user} />
    <section className="profile-listings">
      <div className="profile-panel-heading"><div><span className="eyebrow">YOUR PROPERTIES</span><h2>Your listings</h2></div></div>
      <MyListings />
    </section>
  </main><SiteFooter /></>;
}
