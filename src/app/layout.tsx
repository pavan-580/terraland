import type { Metadata } from "next";
import { ChatWidget } from "@/components/chat-widget";
import { AccountPhoneGate } from "@/components/account-phone-gate";
import { VisitTracker } from "@/components/visit-tracker";
import "./globals.css";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://terraland.in").replace(/\/+$/, "");

export const metadata: Metadata = {
  title: {
    default: "NILAY | Land and plots for sale across India",
    template: "%s | NILAY",
  },
  description: "Explore land for sale, residential plots, agricultural property, farm stays, and rental places across India with NILAY.",
  keywords: ["land for sale India", "plots for sale India", "residential plots", "agricultural land", "farm land", "Telangana real estate", "Telugu land marketplace"],
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "NILAY | Land and plots for sale across India",
    description: "Explore land for sale, residential plots, agricultural property, farm stays, and rental places across India with NILAY.",
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
      <body>{children}<ChatWidget /><AccountPhoneGate /><VisitTracker /></body>
    </html>
  );
}
