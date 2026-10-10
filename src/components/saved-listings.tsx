"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Heart } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PropertyCard } from "@/components/property-card";
import type { Property } from "@/lib/market";

export function SavedListings() {
  const [items, setItems] = useState<Property[]>([]);
  const [status, setStatus] = useState<"loading" | "signed-out" | "ready" | "error">("loading");
  useEffect(() => {
    fetch("/api/favorites").then(async (response) => {
      if (response.status === 401) { setStatus("signed-out"); return; }
      if (!response.ok) throw new Error("Your saved places could not be loaded.");
      setItems(await response.json() as Property[]);
      setStatus("ready");
    }).catch(() => setStatus("error"));
  }, []);
  return <><SiteHeader /><main className="saved-page"><span className="eyebrow">YOUR PERSONAL COLLECTION</span><h1>Places worth <em>keeping close.</em></h1><p>All the land you&apos;ve saved, in one thoughtful little list.</p>
    {status === "loading" && <div className="loading-state">Gathering your saved places…</div>}
    {status === "signed-out" && <div className="empty-state"><Heart size={24} /><h3>Your places are waiting.</h3><p>Sign in to keep a list of the properties you&apos;re considering.</p><Link className="button button-dark" href="/sign-in?next=%2Fsaved">Sign in <ArrowUpRight size={16} /></Link></div>}
    {status === "error" && <div className="form-error">Your saved places could not be loaded. Please refresh and try again.</div>}
    {status === "ready" && (items.length ? <div className="property-grid saved-grid">{items.map((property) => <PropertyCard key={property.id} property={property} />)}</div> : <div className="empty-state"><Heart size={24} /><h3>A little room for possibility.</h3><p>Tap the heart on any listing to save it for later.</p><Link className="button button-dark" href="/search">Explore land <ArrowUpRight size={16} /></Link></div>)}
  </main><SiteFooter /></>;
}
