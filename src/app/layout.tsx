import type { Metadata } from "next";
import { ChatWidget } from "@/components/chat-widget";
import { AccountPhoneGate } from "@/components/account-phone-gate";
import { VisitTracker } from "@/components/visit-tracker";
import { PromotionPopup } from "@/components/promotion-popup";
import "./globals.css";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nkart.store").replace(/\/+$/, "");

export const metadata: Metadata = {
  title: {
    default: "NILAY | Residential Plots & Land in Miyapur, Hyderabad",
    template: "%s | NILAY",
  },
  description: "Verified residential plots and land marketplace in Miyapur, Hyderabad, Telangana. Direct buyer-seller connections, transparent documentation, and arranged site visits.",
  keywords: ["plots for sale Miyapur", "residential plots Hyderabad", "land in Miyapur", "Telangana plots", "NILAY real estate", "HMDA approved plots", "Miyapur land marketplace"],
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "NILAY | Residential Plots & Land in Miyapur, Hyderabad",
    description: "Verified residential plots and land marketplace in Miyapur, Hyderabad, Telangana. Direct buyer-seller connections, transparent documentation, and arranged site visits.",
    locale: "en_IN",
    type: "website",
    siteName: "NILAY",
    url: siteUrl,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN">
      <body><PromotionPopup />{children}<ChatWidget /><AccountPhoneGate /><VisitTracker /></body>
    </html>
  );
}
