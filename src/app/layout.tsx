import type { Metadata } from "next";
import { ChatWidget } from "@/components/chat-widget";
import { AccountPhoneGate } from "@/components/account-phone-gate";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NILAY — Land and plots for sale across India",
    template: "%s | NILAY",
  },
  description: "Explore land, residential plots, and agricultural property for sale across every state in India.",
  keywords: ["భూమి అమ్మకానికి", "ప్లాట్లు", "వ్యవసాయ భూమి", "land for sale India", "plots for sale India", "real estate India", "Telugu land marketplace"],
  ...(process.env.NEXT_PUBLIC_SITE_URL ? { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL) } : {}),
  openGraph: {
    title: "NILAY — Land and plots for sale across India",
    description: "Explore land, residential plots, and agricultural property for sale across every state in India.",
    locale: "en_IN",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN">
      <body>{children}<ChatWidget /><AccountPhoneGate /></body>
    </html>
  );
}
