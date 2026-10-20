import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDownRight, ArrowUpRight, Check, MoveUpRight, ShieldCheck, MapPin, UserCheck } from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { PropertyTypePicker } from "@/components/property-type-picker";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StickyRegisterButton } from "@/components/sticky-register-button";
import { allPropertyTypes } from "@/lib/market";
import { db, getSiteSetting, publicPropertyFromRow } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { alternates: { canonical: "/" } };
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://terraland.in").replace(/\/+$/, "");

const cityCards = [
  { name: "Hyderabad", image: "https://etimg.etb2bimg.com/thumb/msid-99644024%2Cwidth-1200%2Cheight-900%2Cresizemode-4/.jpg" },
  { name: "Vijayawada", image: "https://www.ghar.tv/intelligence/pics/giart190.jpg" },
  { name: "Visakhapatnam", image: "https://images.unsplash.com/photo-1763230302722-f93efbc94ec5?auto=format&fit=crop&w=1000&q=80" },
  { name: "Kakinada", image: "https://www.dekholand.com/assets/img/city/kakinada.jpeg" },
  { name: "Tirupati", image: "https://news.tirumala.org/wp-content/uploads/2024/08/TEMPLE-AERIAL-VIEW.jpg" },
  { name: "Guntur", image: "https://www.dekholand.com/assets/img/city/guntur.png" },
];

const cityCardBackground = (image: string) =>
  `linear-gradient(115deg, rgba(19,181,234,.12), rgba(155,114,203,.11) 48%, rgba(217,101,112,.12)), linear-gradient(180deg, rgba(11,20,16,.04) 32%, rgba(11,20,16,.78)), url("${image}")`;

export default async function Home() {
  const user = await currentUser();
  const savedPropertyTypes = (db.prepare("SELECT DISTINCT type FROM properties WHERE status = 'published' AND TRIM(type) != '' ORDER BY type COLLATE NOCASE").all() as { type: string }[])
    .map(({ type }) => type.trim()).filter(Boolean);
  const searchablePropertyTypes = [...new Map([...allPropertyTypes, ...savedPropertyTypes].map((type) => [type.toLocaleLowerCase(), type])).values()];

  const latestProperties = (db.prepare(`
    SELECT properties.*, users.email AS sellerEmail FROM properties
    LEFT JOIN users ON users.id = properties.ownerId
    WHERE properties.status = 'published' AND properties.listingCategory = 'sale'
    ORDER BY properties.createdAt DESC, properties.rowid DESC
    LIMIT 6
  `).all() as Record<string, unknown>[]).map((row) => publicPropertyFromRow(row, getSiteSetting("showSellerPhones") !== "false" && Boolean(user)));
  const tickerText = getSiteSetting("homeTickerText")?.trim() || "New verified plots are added after owner and site checks.";
  const tickerPropertyId = getSiteSetting("homeTickerPropertyId")?.trim();
  const tickerPropertyRow = tickerPropertyId
    ? db.prepare("SELECT properties.*, users.email AS sellerEmail FROM properties LEFT JOIN users ON users.id = properties.ownerId WHERE properties.id = ? AND properties.status = 'published'").get(tickerPropertyId) as Record<string, unknown> | undefined
    : undefined;
  const tickerProperty = tickerPropertyRow
    ? publicPropertyFromRow(tickerPropertyRow, getSiteSetting("showSellerPhones") !== "false" && Boolean(user))
    : latestProperties[0];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "NILAY",
        description: "Residential plots and land marketplace serving Telangana and Andhra Pradesh.",
        inLanguage: ["en-IN", "te-IN", "hi-IN"],
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/search?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "NILAY",
        url: siteUrl,
        description: "A property marketplace for residential plots and land, with owner listings and buyer enquiries.",
        address: { "@type": "PostalAddress", addressLocality: "Hyderabad", addressRegion: "Telangana", addressCountry: "IN" },
        areaServed: ["Telangana", "Andhra Pradesh"],
        knowsAbout: ["Residential plots", "Land listings", "Telangana land records", "Property due diligence"],
      },
    ],
  };


  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <main>
        <section className="hero">
          <SiteHeader variant="hero" />
          <div className="hero-image hero-image-one" aria-hidden="true" />
          <div className="hero-image hero-image-two" aria-hidden="true" />
          <div className="hero-image hero-image-three" aria-hidden="true" />
          <div className="hero-scrim" />
          <div className="hero-content">
            <div className="hero-search-section">
              <h1 className="hero-search-heading">Verified plots, direct from owners.</h1>
              <p className="hero-search-intro">Search by area or choose a city.</p>
              <form action="/search" className="hero-search">
                <label className="search-field">
                  <span>LOCALITY / COLONY</span>
                  <input name="locality" placeholder="e.g. Miyapur, Bachupally, Ameenpur" />
                </label>
                <label className="search-field type-field">
                  <span>PROPERTY TYPE</span>
                  <PropertyTypePicker options={searchablePropertyTypes} />
                </label>
                <button className="button button-dark search-submit search-submit-google-edge" type="submit">
                  Find Plots <ArrowUpRight size={17} />
                </button>
              </form>
            </div>
            <div className="hero-cities-section">
              <p className="hero-cities-heading">Explore by city</p>
              <div className="hero-city-grid" aria-label="Search plots by city">
                {cityCards.map((city) => (
                  <Link
                    className="hero-city-card"
                    key={city.name}
                    href={`/search?city=${encodeURIComponent(city.name)}`}
                    style={{
                      backgroundImage: cityCardBackground(city.image)
                    }}
                  >
                    <strong>{city.name}</strong>
                  </Link>
                ))}
              </div>
              <StickyRegisterButton />
            </div>
          </div>
        </section>

        {tickerProperty && (
          <section className="home-listing-ticker" aria-label="Featured new listing">
            <Link
              className="home-listing-ticker-image"
              href={`/properties/${tickerProperty.id}`}
              aria-label={`View ${tickerProperty.title}`}
              style={{ backgroundImage: `url("${tickerProperty.image}")` }}
            />
            <div className="home-listing-ticker-copy">
              <span className="eyebrow">NEW VERIFIED PLOT</span>
              <Link href={`/properties/${tickerProperty.id}`} className="home-listing-ticker-title">
                {tickerProperty.title}
              </Link>
              <div className="home-listing-ticker-text" title={tickerText}>
                {tickerText}
              </div>
            </div>
            <Link
              className="home-listing-ticker-link"
              href={`/properties/${tickerProperty.id}`}
              aria-label="View the new listing"
            >
              <MoveUpRight size={18} />
            </Link>
          </section>
        )}

        <section className="section places-section">
          <div className="places-heading">
            <div>
              <h2>Explore by city</h2>
            </div>
          </div>
          <div className="place-grid city-grid">
            {cityCards.map((city) => (
              <Link
                className="city-photo-card"
                key={city.name}
                href={`/search?city=${encodeURIComponent(city.name)}`}
                aria-label={`Explore plots in ${city.name}`}
                style={{
                  backgroundImage: cityCardBackground(city.image)
                }}
              >
                <strong>{city.name}</strong>
              </Link>
            ))}
          </div>
        </section>

        <section className="trust-strip">
          <span>THE TERRALAND STANDARD</span>
          <div><strong>Verified owners.</strong> Every plot is checked on site.</div>
          <Link href="/requirements">Tell us what you need <ArrowUpRight size={15} /></Link>
        </section>

        {/* Featured Listings or Launch Zero-State */}
        <section className="section featured-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">VERIFIED RESIDENTIAL PLOTS</span>
              <h2>Verified plots,<br /><em>clearly presented.</em></h2>
            </div>
            <div className="section-aside">
              <p>We check the owner, site details, and available records before publishing.</p>
              <Link className="text-link" href="/search?category=sale">
                View all available plots <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>

          {latestProperties.length > 0 ? (
            <div className="property-grid">
              {latestProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="launch-zero-state">
              <div className="zero-state-card">
                <div className="zero-icon">
                  <ShieldCheck size={36} />
                </div>
                <span className="eyebrow">VERIFIED LISTINGS ONLY</span>
                <h3>No verified plots are listed just yet.</h3>
                <p>We meet owners and check plot details before a listing goes live. Tell us what you need, or submit a plot for review.</p>

                <div className="zero-state-options">
                  <div className="option-col">
                    <UserCheck size={20} />
                    <h4>Looking to buy?</h4>
                    <p>Share your preferred area and budget. We’ll help you find a verified owner.</p>
                    <Link href="/requirements" className="button button-dark">
                      Share your requirements <ArrowUpRight size={16} />
                    </Link>
                  </div>

                  <div className="option-col">
                    <MapPin size={20} />
                    <h4>Have a plot to sell?</h4>
                    <p>Send us the details. We’ll review the plot before publishing it.</p>
                    <Link href="/sell" className="button button-outline">
                      Submit your plot <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Direct Seller Acquisition Band */}
        <section className="seller-band">
          <div className="seller-copy">
            <span className="eyebrow">FOR GENUINE LANDOWNERS</span>
            <h2>Sell your plot.<br /><em>Meet real buyers.</em></h2>
            <p>
              List directly with Terraland and connect with buyers looking in Miyapur and nearby areas.
            </p>
            <div className="seller-actions">
              <Link className="button button-cream" href="/sell">
                Submit your plot <ArrowUpRight size={16} />
              </Link>
              <a
                className="seller-whatsapp"
                href="https://wa.me/918074399963?text=Hello%20Terraland%2C%20I%20own%20a%20residential%20plot%20in%20Miyapur%20and%20would%20like%20to%20list%20it."
                target="_blank"
                rel="noreferrer"
              >
                Connect on WhatsApp <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
          <div className="seller-art">
            <div className="seller-art-image" />
            <div className="seller-stamp">
              <span>TERRALAND<br />VERIFIED<br />GROUND</span>
              <ArrowDownRight size={20} />
            </div>
            <div className="seller-side-note">
              HYDERABAD WEST<br />RESIDENTIAL PLOTS
            </div>
          </div>
        </section>

        {/* Terraland Four Principles */}
        <section className="section assurance-section">
          <div className="assurance-intro">
            <span className="eyebrow">THE TERRALAND STANDARD</span>
            <h2>How we check <em>each plot.</em></h2>
            <p>Clear details help you decide what to explore and what to verify further.</p>
          </div>
          <div className="assurance-list">
            <div>
              <span>01</span>
              <div>
                <strong>On-site inspection</strong>
                <p>We visit the plot and record its boundaries, access, and actual site photos.</p>
              </div>
              <Check size={18} />
            </div>
            <div>
              <span>02</span>
              <div>
                <strong>Clear pricing</strong>
                <p>See the rate per square yard and whether the price is negotiable.</p>
              </div>
              <Check size={18} />
            </div>
            <div>
              <span>03</span>
              <div>
                <strong>Document review</strong>
                <p>We share available records and approvals for you to review with your legal adviser.</p>
              </div>
              <Check size={18} />
            </div>
            <div>
              <span>04</span>
              <div>
                <strong>Guided site visits</strong>
                <p>Arrange a visit to see the plot and discuss the location in person.</p>
              </div>
              <Check size={18} />
            </div>
          </div>
        </section>

        {/* Due Diligence Field Notes */}
        <section className="journal-band">
          <span className="eyebrow">BUYER &amp; SELLER ADVISORY</span>
          <h2>Make an informed<br /><em>land purchase.</em></h2>
          <p>Practical guides to land records, layout approvals, and title checks in Telangana.</p>
          <Link href="/guides" className="button button-outline-light">
            Explore buyer guides <MoveUpRight size={16} /></Link>
          <div className="journal-orbit">T.</div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
