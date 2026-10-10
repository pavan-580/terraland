import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BadgeCheck, Check, MapPin } from "lucide-react";
import { EmiCalculator } from "@/components/emi-calculator";
import { InquiryForm } from "@/components/inquiry-form";
import { ListingShare } from "@/components/listing-share";
import { PropertyCard } from "@/components/property-card";
import { PropertyGallery } from "@/components/property-gallery";
import { PropertyReviews } from "@/components/property-reviews";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { db, propertyFromRow } from "@/lib/db";
import { formatListingPrice, formatPrice } from "@/lib/market";
import { currentUser } from "@/lib/session";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function yesNo(value?: string) {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  return "Not specified";
}

function mapSearchLocation(mapUrl: string | undefined, fallback: string) {
  if (!mapUrl) return fallback;
  try {
    const url = new URL(mapUrl);
    const text = `${url.pathname} ${url.search}`;
    const coordinates = text.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) ??
      text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (coordinates) return `${coordinates[1]},${coordinates[2]}`;
    const query = url.searchParams.get("q") ?? url.searchParams.get("query");
    return query && !query.startsWith("https://") ? query : fallback;
  } catch {
    return fallback;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const row = db.prepare("SELECT title, description, image FROM properties WHERE id = ? AND status = 'published'").get(id) as
    { title: string; description: string; image: string } | undefined;
  if (!row) return { title: "Land listing" };
  return {
    title: row.title,
    description: row.description,
    openGraph: { title: row.title, description: row.description, images: row.image ? [row.image] : [] },
    ...(process.env.NEXT_PUBLIC_SITE_URL ? {
      alternates: { canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/properties/${encodeURIComponent(id)}` },
    } : {}),
  };
}

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = db.prepare("SELECT * FROM properties WHERE id = ? AND status = 'published'").get(id) as Record<string, unknown> | undefined;
  if (!row) notFound();
  const property = propertyFromRow(row);
  const relatedRows = db.prepare("SELECT * FROM properties WHERE id != ? AND status = 'published' AND listingCategory = ? ORDER BY createdAt DESC, rowid DESC LIMIT 2")
    .all(property.id, property.listingCategory ?? "sale") as Record<string, unknown>[];
  const related = relatedRows.map(propertyFromRow);
  const user = await currentUser();
  const photos = property.images?.length ? property.images : [property.image];
  const listingCategory = property.listingCategory ?? "sale";
  const listingLabel = listingCategory === "rent" ? "FOR RENT" : "FOR SALE";
  const mapQuery = [property.address, property.landmark, property.locality, property.city].filter(Boolean).join(", ");
  const embeddedMapQuery = mapSearchLocation(property.mapUrl, mapQuery);
  const address = [property.address, property.landmark, property.locality, property.city].filter(Boolean).join(", ");
  const facts = [
    ["Listing", listingCategory === "rent" ? "For rent" : "For sale"],
    ["Property type", property.type],
    ["Size", `${property.area} ${property.unit}`],
    [listingCategory === "sale" ? "Unit price" : "Rate", listingCategory === "sale"
      ? `${currency.format(property.price / property.area)} / ${property.unit}`
      : formatListingPrice(property)],
    ...(listingCategory === "rent" ? [
      ["Availability", property.availability || "Ask Terraland"],
      ...(property.guestCapacity ? [["Guest capacity", `${property.guestCapacity} guests`] as [string, string]] : []),
      ["Enquiries", "Send a request through Terraland"],
    ] as [string, string][] : []),
    ...(listingCategory === "sale" ? [
    ["Approvals", property.approvals || "Not specified"],
    ["Loan available", yesNo(property.loanAvailable)],
    ["Registration", yesNo(property.registrationAvailable)],
    ["Facing", property.facing || "Not specified"],
    ["Renovation", property.renovation || "Not specified"],
    ["Corner plot", yesNo(property.cornerPlot)],
    ["Road width", property.roadWidth || "Not specified"],
    ["Survey number", property.surveyNumber || "Not specified"],
    ["Soil type", property.soilType || "Not specified"],
    ["Clear title", yesNo(property.clearTitle)],
    ] : []),
  ];
  return <><SiteHeader /><main className="detail-page">
    <div className="detail-breadcrumb"><Link href={`/search?category=${listingCategory}`}><ArrowLeft size={14} /> Back to explore</Link><span>{listingLabel} / {property.city.toUpperCase()}</span></div>
    <section className="detail-heading">
      <div className="detail-heading-copy">
        <div className="detail-meta"><span className="property-badge detail-status">{listingLabel}</span><span>{property.type}</span>{property.verified && <span className="verified-pill"><BadgeCheck size={14} /> Seller details reviewed</span>}</div>
        <h1 translate="no">{property.title}</h1>
        <div className="detail-location"><MapPin size={15} /> {property.locality}, {property.city}</div>
        <div className="detail-quick-facts"><span>Size: <strong>{property.area} {property.unit}</strong></span>{listingCategory === "sale" ? <span>Price / unit: <strong>{formatPrice(Math.round(property.price / property.area))} / {property.unit}</strong></span> : <span>Rate: <strong>{formatListingPrice(property)}</strong></span>}{property.facing && listingCategory === "sale" && <span>Facing: <strong>{property.facing}</strong></span>}</div>
      </div>
      <div className="detail-price-share"><strong>{formatListingPrice(property)}</strong><span>{listingCategory === "sale" ? "Asking price" : "Listed rate · enquire to arrange"}</span><ListingShare title={property.title} /></div>
    </section>

    <PropertyGallery images={photos} title={property.title} badge={property.badge} />

    <div className="detail-layout detail-layout-rich">
      <div className="detail-main detail-cards">
        <section className="detail-card">
          <div className="detail-card-heading"><span className="eyebrow">PROPERTY DESCRIPTION</span><h2>About this place</h2></div>
          <p className="detail-card-copy" translate="no">{property.description}</p>
        </section>
        <section className="detail-card">
          <div className="detail-card-heading"><span className="eyebrow">AT A GLANCE</span><h2>{listingCategory === "sale" ? "Property overview" : "Rental overview"}</h2></div>
          <dl className="property-overview">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </section>
        <section className="detail-card">
          <div className="detail-card-heading"><span className="eyebrow">EXTRA DETAILS</span><h2>Amenities</h2></div>
          {property.amenities?.length ? <ul className="amenities-list">{property.amenities.map((amenity) => <li key={amenity}><Check size={14} />{amenity}</li>)}</ul> : <p className="detail-card-copy">The seller has not added amenities for this listing.</p>}
        </section>
        <section className="detail-card">
          <div className="detail-card-heading"><span className="eyebrow">CONTACT & ADDRESS</span><h2>Find the property</h2></div>
          <dl className="contact-address">
            <div><dt>Seller</dt><dd>{property.owner}</dd></div>
            {property.landmark && <div><dt>Landmark</dt><dd>{property.landmark}</dd></div>}
            <div><dt>Address</dt><dd>{address}</dd></div>
          </dl>
        </section>
        <section className="detail-card detail-map-card">
          <div className="detail-card-heading"><span className="eyebrow">PROPERTY LOCATION</span><h2>{property.locality}, {property.city}</h2></div>
          <iframe title={`Map showing ${property.title}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${encodeURIComponent(embeddedMapQuery)}&output=embed`} />
          <a className="text-link" href={property.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} target="_blank" rel="noreferrer">Open exact location in Google Maps <ArrowUpRight size={14} /></a>
        </section>
        <div className="land-check"><BadgeCheck size={20} /><div><strong>{listingCategory === "sale" ? "A note on due diligence" : "Plan with confidence"}</strong><p>{listingCategory === "sale" ? "Listing details are provided by the seller. Independently verify title, approvals, boundaries, and local requirements before purchase." : "Details are provided by the owner. Send an enquiry to Terraland to confirm availability, rental terms, and amenities."}</p></div></div>
      </div>
      <aside className="inquiry-aside detail-sidebar">
        <div className="seller-profile">
          <span className="seller-avatar">{property.owner.slice(0, 1)}</span>
          <div><strong>{property.owner}</strong><span>Seller {property.verified ? "· Details reviewed" : ""}</span></div>
          <span className="seller-private-note">Contact privately</span>
        </div>
        <InquiryForm propertyId={property.id} title={property.title} type={property.type} listingCategory={listingCategory} pricePeriod={property.pricePeriod}
          city={property.city} locality={property.locality} price={property.price} area={property.area} unit={property.unit} user={user ? { name: user.name, email: user.email } : null} />
      </aside>
    </div>
    {listingCategory === "sale" && <EmiCalculator propertyPrice={property.price} />}
    <PropertyReviews propertyId={property.id} />
    {related.length > 0 && <section className="related-section"><div className="section-heading"><div><span className="eyebrow">KEEP EXPLORING</span><h2>More places to <em>consider.</em></h2></div><Link className="text-link" href="/search">See all listings <ArrowUpRight size={15} /></Link></div><div className="property-grid">{related.map((item) => <PropertyCard key={item.id} property={item} />)}</div></section>}
  </main><SiteFooter /></>;
}
