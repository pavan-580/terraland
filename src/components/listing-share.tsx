"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

export function ListingShare({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  function shareTo(destination: "facebook" | "whatsapp") {
    const url = window.location.href;
    const target = destination === "facebook"
      ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
      : `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    setError("");
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("Copying the link is not available in this browser.");
    }
  }

  return <div className="listing-share" aria-label="Share this property">
    <button type="button" onClick={() => shareTo("facebook")} aria-label="Share on Facebook"><span className="share-facebook-mark">f</span></button>
    <button type="button" onClick={() => shareTo("whatsapp")} aria-label="Share on WhatsApp"><Share2 size={16} /></button>
    <button type="button" onClick={() => void copyLink()} aria-label={copied ? "Link copied" : "Copy listing link"}>{copied ? <Check size={16} /> : <Copy size={16} />}</button>
    <span className="visually-hidden" aria-live="polite">{copied ? "Listing link copied." : ""}</span>
    {error && <span className="listing-share-error" role="status">{error}</span>}
  </div>;
}
