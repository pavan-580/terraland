import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BadgeCheck, Check, MapPin } from "lucide-react";
import { EmiCalculator } from "@/components/emi-calculator";
import { InquiryForm } from "@/components/inquiry-form";
import { ListingShare } from "@/components/listing-share";
import { PropertyCard } from "@/components/property-card";
import { PropertyGallery } from "@/components/property-gallery";
import { PropertyReviews } from "@/components/property-reviews";
import { SellerPhoneLink } from "@/components/seller-phone-link";
import { WhatsAppListingLink } from "@/components/whatsapp-listing-link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { db, getSiteSetting, publicPropertyFromRow } from "@/lib/db";
import { formatListingPrice, formatPrice } from "@/lib/market";
import { currentUser } from "@/lib/session";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://terraland.in").replace(/\/+$/, "");

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
  const row = db.prepare("SELECT title, description, image, type, listingCategory, city, locality, price, area, unit FROM properties WHERE id = ? AND status = 'published'").get(id) as
    { title: string; description: string; image: string; type: string; listingCategory: string; city: string; locality: string; price: number; area: number; unit: string } | undefined;
  if (!row) return { title: "Land listing" };
  const listingMode = row.listingCategory === "rent" ? "for rent" : "for sale";
  const title = `${row.type} ${listingMode} in ${row.locality}, ${row.city}: ${row.title}`;
  const description = `${row.title}: ${row.type} ${listingMode} in ${row.locality}, ${row.city}. ${row.area} ${row.unit}, ${currency.format(row.price)}. ${row.description}`
    .replace(/\s+/g, " ").trim().slice(0, 160);
  const canonical = `${siteUrl}/properties/${encodeURIComponent(id)}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: "NILAY", locale: "en_IN", type: "website", images: row.image ? [row.image] : [] },
    twitter: { card: "summary_large_image", title, description, images: row.image ? [row.image] : [] },
  };
}

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = db.prepare("SELECT properties.*, users.email AS sellerEmail FROM properties LEFT JOIN users ON users.id = properties.ownerId WHERE properties.id = ? AND properties.status = 'published'").get(id) as Record<string, unknown> | undefined;
  if (!row) notFound();
  const user = await currentUser();
  const showSellerContacts = getSiteSetting("showSellerPhones") !== "false" && Boolean(user);
  const property = publicPropertyFromRow(row, showSellerContacts);
  const relatedRows = db.prepare("SELECT properties.*, users.email AS sellerEmail FROM properties LEFT JOIN users ON users.id = properties.ownerId WHERE properties.id != ? AND properties.status = 'published' AND properties.listingCategory = ? ORDER BY properties.createdAt DESC, properties.rowid DESC LIMIT 2")
    .all(property.id, property.listingCategory ?? "sale") as Record<string, unknown>[];
  const related = relatedRows.map((item) => publicPropertyFromRow(item, showSellerContacts));
  const photos = property.images?.length ? property.images : [property.image];
  const listingCategory = property.listingCategory ?? "sale";
  const listingLabel = listingCategory === "rent" ? "FOR RENT" : "FOR SALE";
  const mapQuery = [property.address, property.landmark, property.locality, property.city].filter(Boolean).join(", ");
  const embeddedMapQuery = mapSearchLocation(property.mapUrl, mapQuery);
  const address = [property.address, property.landmark, property.locality, property.city].filter(Boolean).join(", ");
  const canonical = `${siteUrl}/properties/${encodeURIComponent(property.id)}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${property.title} | ${property.type} for ${listingCategory === "rent" ? "rent" : "sale"} in ${property.locality}, ${property.city}`,
    description: property.description,
    url: canonical,
    mainEntity: {
      "@type": "Place",
      name: property.title,
      description: property.description,
      image: photos,
      address: {
        "@type": "PostalAddress",
        ...(property.address ? { streetAddress: property.address } : {}),
        addressLocality: property.locality,
        addressRegion: property.city,
        addressCountry: "IN",
      },
      additionalProperty: [
        { "@type": "PropertyValue", name: "Property type", value: property.type },
        { "@type": "PropertyValue", name: "Listing type", value: listingCategory === "rent" ? "For rent" : "For sale" },
        { "@type": "PropertyValue", name: "Area", value: `${property.area} ${property.unit}` },
      ],
    },
  };
  const facts = [
    ["Listing", listingCategory === "rent" ? "For rent" : "For sale"],
    ["Property type", property.type],
    ["Size", `${property.area} ${property.unit}`],
    [listingCategory === "sale" ? "Unit price" : "Rate", listingCategory === "sale"
      ? `${currency.format(property.price / property.area)} / ${property.unit}`
      : formatListingPrice(property)],
    ...(listingCategory === "rent" ? [
      ["Availability", property.availability || "Ask NILAY"],
      ...(property.guestCapacity ? [["Guest capacity", `${property.guestCapacity} guests`] as [string, string]] : []),
      ["Enquiries", "Send a request through NILAY"],
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
  return <><SiteHeader /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} /><main className="detail-page">
    <div className="detail-breadcrumb"><span>{listingLabel} / {property.city.toUpperCase()}</span></div>
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
    {property.videos?.length ? <section className="detail-video-gallery" aria-label="Property videos">
      <div className="detail-card-heading"><span className="eyebrow">PROPERTY VIDEOS</span><h2>Take a closer look</h2></div>
      <div className="detail-video-grid">{property.videos.map((video, index) => <video key={`${video}-${index}`} src={video} controls playsInline preload="metadata" aria-label={`${property.title} video ${index + 1}`} />)}</div>
    </section> : null}

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
        <div className="land-check"><BadgeCheck size={20} /><div><strong>{listingCategory === "sale" ? "A note on due diligence" : "Plan with confidence"}</strong><p>{listingCategory === "sale" ? "Listing details are provided by the seller. Independently verify title, approvals, boundaries, and local requirements before purchase." : "Details are provided by the owner. Send an enquiry to NILAY to confirm availability, rental terms, and amenities."}</p></div></div>
      </div>
      <aside className="inquiry-aside detail-sidebar">
        {showSellerContacts ? <div className="seller-profile">
          <span className="seller-avatar">{property.owner.slice(0, 1)}</span>
          <div><strong>{property.owner}</strong><span>Contact the seller directly</span></div>
          {property.phone && <SellerPhoneLink className="seller-public-phone" propertyId={property.id} phone={property.phone} owner={property.owner}>{property.phone}</SellerPhoneLink>}
          {property.sellerEmail && <a className="seller-public-email" href={`mailto:${property.sellerEmail}`}>{property.sellerEmail}</a>}
          <WhatsAppListingLink className="seller-public-whatsapp" property={property} />
        </div> : <>
          <div className="seller-profile"><span className="seller-avatar">{property.owner.slice(0, 1)}</span><div><strong>{property.owner}</strong><span>Send us an enquiry and our team will contact you shortly.</span></div><WhatsAppListingLink className="seller-public-whatsapp" property={property} /></div>
          <InquiryForm propertyId={property.id} title={property.title} type={property.type} listingCategory={listingCategory} pricePeriod={property.pricePeriod}
            city={property.city} locality={property.locality} price={property.price} area={property.area} unit={property.unit} user={user ? { name: user.name, email: user.email, phone: user.phone } : null} />
        </>}
      </aside>
    </div>
    {listingCategory === "sale" && <EmiCalculator propertyPrice={property.price} />}
    <PropertyReviews propertyId={property.id} />
    {related.length > 0 && <section className="related-section"><div className="section-heading"><div><span className="eyebrow">KEEP EXPLORING</span><h2>More places to <em>consider.</em></h2></div><Link className="text-link" href="/search">See all listings <ArrowUpRight size={15} /></Link></div><div className="property-grid">{related.map((item) => <PropertyCard key={item.id} property={item} />)}</div></section>}
  </main><SiteFooter /></>;
}
