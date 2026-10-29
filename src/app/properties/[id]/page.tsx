import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BadgeCheck, Check, MapPin, Phone, ShieldAlert, Sparkles } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { EmiCalculator } from "@/components/emi-calculator";
import { InquiryForm } from "@/components/inquiry-form";
import { ListingShare } from "@/components/listing-share";
import { PropertyCard } from "@/components/property-card";
import { PropertyGallery } from "@/components/property-gallery";
import { PropertyReviews } from "@/components/property-reviews";
import { PropertyActionButtons } from "@/components/property-action-buttons";
import { SellerPhoneLink } from "@/components/seller-phone-link";
import { WhatsAppListingLink } from "@/components/whatsapp-listing-link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { db, getSiteSetting, publicPropertyFromRow } from "@/lib/db";
import { formatListingPrice, calculatePricePerSqYd, formatPricePerSqYd } from "@/lib/market";
import { currentUser } from "@/lib/session";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nkart.store").replace(/\/+$/, "");

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
  if (!row) return { title: "Plot listing in Hyderabad | NILAY" };
  const listingMode = row.listingCategory === "rent" ? "for rent" : "for sale";
  const title = `${row.type} ${listingMode} in ${row.locality}, ${row.city}: ${row.title} | NILAY`;
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
  const showSellerPhonesSetting = getSiteSetting("showSellerPhones") !== "false";
  const showSellerContacts = showSellerPhonesSetting && Boolean(user);
  const adminContactPhone = getSiteSetting("adminContactPhone") || "8074399963";
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

  // Hyderabad standard price per sq yd
  const pricePerSqYd = calculatePricePerSqYd(property.price, property.area, property.unit);
  const pricePerSqYdFormatted = pricePerSqYd ? formatPricePerSqYd(pricePerSqYd) : null;

  const negotiabilityLabel = property.isNegotiable === "negotiable"
    ? "Price Negotiable"
    : property.isNegotiable === "slightly_negotiable"
    ? "Slightly Negotiable"
    : property.isNegotiable === "fixed"
    ? "Fixed Price"
    : "Negotiable upon site visit";

  const documentStatusLabel = property.documentStatus === "docs_collected"
    ? "Link Documents Collected & Initial Review Done"
    : property.documentStatus === "admin_reviewed"
    ? "Admin Title-Verified Listing"
    : "Seller-Declared Details (Title verification advised)";

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
        ...(pricePerSqYdFormatted ? [{ "@type": "PropertyValue", name: "Price per sq yd", value: pricePerSqYdFormatted }] : []),
      ],
    },
  };

  const facts = [
    ["Listing", listingCategory === "rent" ? "For rent" : "For sale"],
    ["Property type", property.type],
    ["Plot size", `${property.area} ${property.unit}`],
    ...(listingCategory === "sale" && pricePerSqYdFormatted ? [["Price per Sq. Yd.", pricePerSqYdFormatted]] : []),
    ["Negotiability", negotiabilityLabel],
    ["Document status", documentStatusLabel],
    ...(listingCategory === "rent" ? [
      ["Availability", property.availability || "Direct via NILAY"],
      ...(property.guestCapacity ? [["Guest capacity", `${property.guestCapacity} guests`] as [string, string]] : []),
      ["Enquiries", "Coordinated through NILAY"],
    ] as [string, string][] : []),
    ...(listingCategory === "sale" ? [
      ["Facing", property.facing || "Not specified"],
      ["Road access width", property.roadWidth || "Not specified"],
      ["Approvals", property.approvals || "Gram Panchayat / Layout under review"],
      ["Loan availability", yesNo(property.loanAvailable)],
      ["Registration readiness", yesNo(property.registrationAvailable)],
      ["Corner plot", yesNo(property.cornerPlot)],
      ["Survey / Plot number", property.surveyNumber || "Available upon visit"],
      ["Soil & Ground", property.soilType || "Not specified"],
      ["Clear title assertion", yesNo(property.clearTitle)],
    ] : []),
  ];

  return (
    <>
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <main className="detail-page">
        <div className="detail-breadcrumb">
          <BackButton className="breadcrumb-back-link" fallbackHref="/search?category=sale" label="Back to plots" />
          <span className="breadcrumb-sep">/</span>
          <span>{property.city}</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">{property.locality}</span>
        </div>

        <section className="detail-heading">
          <div className="detail-heading-copy">
            <div className="detail-meta">
              <span className="property-badge detail-status">{listingLabel}</span>
              <span>{property.type}</span>
              {property.verified && (
                <span className="verified-pill">
                  <BadgeCheck size={14} /> Founder Verified Plot
                </span>
              )}
              <span className="negotiable-pill">
                <Sparkles size={13} /> {negotiabilityLabel}
              </span>
            </div>

            <h1 translate="no">{property.title}</h1>
            <div className="detail-location">
              <MapPin size={15} /> {property.locality}, {property.city}
            </div>

            <div className="detail-quick-facts">
              <span>Size: <strong>{property.area} {property.unit}</strong></span>
              {listingCategory === "sale" && pricePerSqYdFormatted && (
                <span>Rate: <strong>{pricePerSqYdFormatted}</strong></span>
              )}
              {property.facing && listingCategory === "sale" && (
                <span>Facing: <strong>{property.facing}</strong></span>
              )}
              {property.roadWidth && (
                <span>Road: <strong>{property.roadWidth}</strong></span>
              )}
            </div>
          </div>

          <div className="detail-price-share">
            <strong>{formatListingPrice(property)}</strong>
            <span>{listingCategory === "sale" ? "Total asking price" : "Listed rental rate"}</span>
            <ListingShare title={property.title} />
          </div>
        </section>

        <PropertyGallery images={photos} videos={property.videos} title={property.title} badge={property.badge} />

        <div className="detail-layout detail-layout-rich">
          <div className="detail-main detail-cards">
            {/* Primary Action Buttons for Mobile/Desktop */}
            <PropertyActionButtons
              property={{
                id: property.id,
                title: property.title,
                locality: property.locality,
                city: property.city,
                price: property.price,
                area: property.area,
                unit: property.unit,
                phone: property.phone,
                owner: property.owner,
                sellerContactsVisible: showSellerContacts,
                type: property.type,
                listingCategory: property.listingCategory,
                facing: property.facing,
                roadWidth: property.roadWidth,
                description: property.description,
                approvals: property.approvals,
              }}
              adminPhone={adminContactPhone}
              showSellerPhones={showSellerPhonesSetting}
              user={user ? { name: user.name, phone: user.phone, email: user.email } : null}
            />

            <section className="detail-card">
              <div className="detail-card-heading">
                <span className="eyebrow">PROPERTY DESCRIPTION</span>
                <h2>About this plot</h2>
              </div>
              <p className="detail-card-copy" translate="no">{property.description}</p>
            </section>

            <section className="detail-card">
              <div className="detail-card-heading">
                <span className="eyebrow">AT A GLANCE</span>
                <h2>{listingCategory === "sale" ? "Residential Plot Overview" : "Rental Overview"}</h2>
              </div>
              <dl className="property-overview">
                {facts.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="detail-card">
              <div className="detail-card-heading">
                <span className="eyebrow">INFRASTRUCTURE & HIGHLIGHTS</span>
                <h2>Site features</h2>
              </div>
              {property.amenities?.length ? (
                <ul className="amenities-list">
                  {property.amenities.map((amenity) => (
                    <li key={amenity}>
                      <Check size={14} /> {amenity}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="detail-card-copy">Electricity, access road, and ground water features to be inspected during site visit.</p>
              )}
            </section>

            <section className="detail-card">
              <div className="detail-card-heading">
                <span className="eyebrow">CONTACT & COORDINATION</span>
                <h2>Seller &amp; Inspection Representative</h2>
              </div>
              <dl className="contact-address">
                <div><dt>Seller / Contact</dt><dd>{property.owner}</dd></div>
                {property.landmark && <div><dt>Landmark</dt><dd>{property.landmark}</dd></div>}
                <div><dt>Address / Area</dt><dd>{address}</dd></div>
              </dl>
            </section>

            <section className="detail-card detail-map-card">
              <div className="detail-card-heading">
                <span className="eyebrow">PROPERTY LOCATION</span>
                <h2>{property.locality}, {property.city}</h2>
              </div>
              <iframe
                title={`Map showing ${property.title}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(embeddedMapQuery)}&output=embed`}
              />
              <a
                className="text-link"
                href={property.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                target="_blank"
                rel="noreferrer"
              >
                Open exact location in Google Maps <ArrowUpRight size={14} />
              </a>
            </section>

            {/* Clear Legal & Due Diligence Disclosure */}
            <div className="land-check legal-disclosure-box">
              <ShieldAlert size={22} className="alert-icon" />
              <div>
                <strong>Legal &amp; Title Diligence Advisory</strong>
                <p>
                  Listing details are based on seller declarations and initial verification. NILAY facilitates direct contact and physical site inspections. Buyers are strongly advised to independently verify original link documents, revenue survey numbers, and the Encumbrance Certificate (EC) with certified legal counsel before signing sale agreements or transferring funds.
                </p>
              </div>
            </div>
          </div>

          <aside className="inquiry-aside detail-sidebar" id="enquiry-section">
            <div className="sidebar-card">
              <div className="seller-profile">
                <span className="seller-avatar">{property.owner.slice(0, 1)}</span>
                <div>
                  <strong>{property.owner}</strong>
                  <span>{property.verified ? "Verified Landowner / Seller" : "Listed Property Seller"}</span>
                </div>
                {showSellerContacts && property.phone && (
                  <SellerPhoneLink className="seller-public-phone" propertyId={property.id} phone={property.phone} owner={property.owner}>
                    <Phone size={13} style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 5 }} />
                    <span>Call seller directly</span>
                  </SellerPhoneLink>
                )}
                {showSellerContacts && property.sellerEmail && (
                  <a className="seller-public-email" href={`mailto:${property.sellerEmail}`}>{property.sellerEmail}</a>
                )}
                <WhatsAppListingLink className="seller-public-whatsapp" property={property} adminPhone={adminContactPhone} />
              </div>

              <div className="sidebar-divider" />

              <InquiryForm
                propertyId={property.id}
                title={property.title}
                type={property.type}
                listingCategory={listingCategory}
                pricePeriod={property.pricePeriod}
                city={property.city}
                locality={property.locality}
                price={property.price}
                area={property.area}
                unit={property.unit}
                user={user ? { name: user.name, email: user.email, phone: user.phone } : null}
              />
            </div>
          </aside>
        </div>

        {listingCategory === "sale" && <EmiCalculator propertyPrice={property.price} />}
        <PropertyReviews propertyId={property.id} />

        {related.length > 0 && (
          <section className="related-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">SAME CORRIDOR</span>
                <h2>More verified plots to <em>consider.</em></h2>
              </div>
              <Link className="text-link" href="/search">
                See all plots in Miyapur <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="property-grid">
              {related.map((item) => (
                <PropertyCard key={item.id} property={item} />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
