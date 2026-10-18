import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Check, MoveUpRight, ShieldCheck, MapPin, Sparkles, UserCheck } from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { PropertyTypePicker } from "@/components/property-type-picker";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { allPropertyTypes } from "@/lib/market";
import { db, getSiteSetting, publicPropertyFromRow } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const targetCorridors = [
  {
    name: "Miyapur",
    subtext: "Metro & Mumbai Highway Belt",
    badge: "Primary Focus Corridor",
    image: "photo-1500382017468-9049fed747ef",
  },
  {
    name: "Bachupally",
    subtext: "Residential Growth Hub & Schools",
    badge: "Fast Growing",
    image: "photo-1510798831971-661eb04b3739",
  },
  {
    name: "Ameenpur",
    subtext: "Residential Plots & Green Belts",
    badge: "High Buyer Demand",
    image: "photo-1472396961693-142e6e269027",
  },
];

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


  return (
    <>
      <main>
        <section className="hero">
          <SiteHeader variant="hero" />
          <div className="hero-image hero-image-one" aria-hidden="true" />
          <div className="hero-image hero-image-two" aria-hidden="true" />
          <div className="hero-image hero-image-three" aria-hidden="true" />
          <div className="hero-scrim" />
          <div className="hero-content">
            <div className="hero-kicker">
              <span /> RESIDENTIAL LAND &amp; PLOTS · MIYAPUR, HYDERABAD
            </div>
            <h1>
              Direct plot acquisition.<br />
              <em>Zero fake listings.</em>
            </h1>
            <p>
              Connect directly with genuine landowners and verified residential plots in Miyapur, Bachupally, and Ameenpur. Facilitated by a local founder, backed by physical site inspections.
            </p>

            <form action="/search" className="hero-search">
              <label className="search-field">
                <span>LOCALITY / COLONY</span>
                <input name="locality" placeholder="e.g. Miyapur, Bachupally, Ameenpur" />
              </label>
              <label className="search-field type-field">
                <span>PROPERTY TYPE</span>
                <PropertyTypePicker options={searchablePropertyTypes} />
              </label>
              <button className="button button-dark search-submit" type="submit">
                Find Plots <ArrowUpRight size={17} />
              </button>
            </form>

            <div className="hero-under">
              <span><Check size={14} /> Founder-verified titles</span>
              <span><Check size={14} /> ₹/Sq. Yd. transparency</span>
              <Link href="/requirements" className="hero-req-cta">
                <Sparkles size={14} /> Register buyer requirement
              </Link>
            </div>
          </div>
          <div className="hero-caption">
            HYDERABAD <span>TELANGANA</span>
          </div>
          <div className="hero-index"><span>01</span> — 03</div>
        </section>

        <section className="trust-strip">
          <span>THE TRANSPARENT LAND ACQUISITION PLATFORM</span>
          <div><strong>100% Genuine Landowners.</strong> Physically Inspected. Direct Coordination.</div>
          <Link href="/requirements">Register your requirement <ArrowUpRight size={15} /></Link>
        </section>

        {/* Featured Listings or Launch Zero-State */}
        <section className="section featured-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">VERIFIED RESIDENTIAL PLOTS</span>
              <h2>Good ground,<br /><em>hand-checked.</em></h2>
            </div>
            <div className="section-aside">
              <p>Every listing is personally checked with revenue documents and site coordinates in Miyapur &amp; surrounding corridors.</p>
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
                <span className="eyebrow">LAUNCH INTEGRITY COMMITMENT</span>
                <h3>We never show fake listings or dummy broker ads.</h3>
                <p>
                  Terraland is actively onboarding and vetting residential plots in the Miyapur-West corridor.
                  Rather than copying unchecked listings from the web, our founder meets sellers in person to verify survey numbers and physical boundaries.
                </p>

                <div className="zero-state-options">
                  <div className="option-col">
                    <UserCheck size={20} />
                    <h4>Looking to buy a residential plot?</h4>
                    <p>Tell us your preferred locality and budget. We match you with verified private sellers.</p>
                    <Link href="/requirements" className="button button-dark">
                      Register Plot Requirement <ArrowUpRight size={16} />
                    </Link>
                  </div>

                  <div className="option-col">
                    <MapPin size={20} />
                    <h4>Own a plot in Miyapur / West Hyderabad?</h4>
                    <p>List directly with Terraland. Zero commission scams; reviewed before publishing.</p>
                    <Link href="/sell" className="button button-outline">
                      Submit Your Plot for Verification <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Focus Locality Corridors */}
        <section className="section places-section">
          <div className="places-heading">
            <div>
              <span className="eyebrow">CORE FOCUS MARKET</span>
              <h2>Miyapur &amp; <em>Hyderabad West Corridors.</em></h2>
            </div>
            <Link className="text-link" href="/search?category=sale">
              Browse corridor plots <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="place-grid">
            {targetCorridors.map((corridor, index) => (
              <Link
                className={`place-card place-${index + 1}`}
                key={corridor.name}
                href={`/search?category=sale&locality=${encodeURIComponent(corridor.name)}`}
                style={{
                  backgroundImage: `linear-gradient(180deg, transparent 30%, rgba(19,30,24,.8)),url(https://images.unsplash.com/${corridor.image}?auto=format&fit=crop&w=1000&q=85)`
                }}
              >
                <span className="place-index">0{index + 1}</span>
                <div>
                  <span>{corridor.subtext} · {corridor.badge}</span>
                  <strong>{corridor.name}</strong>
                </div>
                <ArrowUpRight size={20} />
              </Link>
            ))}
          </div>
        </section>

        {/* Direct Seller Acquisition Band */}
        <section className="seller-band">
          <div className="seller-copy">
            <span className="eyebrow">FOR GENUINE LANDOWNERS</span>
            <h2>Selling a plot in Miyapur?<br /><em>Find direct buyers.</em></h2>
            <p>
              Skip multiple layers of commission-hungry middlemen. Terraland connects you with vetted, pre-qualified buyers ready to transact.
            </p>
            <div className="seller-actions">
              <Link className="button button-cream" href="/sell">
                List plot for verification <ArrowUpRight size={16} />
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
            <h2>Why buyers &amp; sellers trust us in <em>Miyapur.</em></h2>
            <p>We operate with high integrity: no artificial listings, transparent pricing, and rigorous title disclosures.</p>
          </div>
          <div className="assurance-list">
            <div>
              <span>01</span>
              <div>
                <strong>Physical Site Inspection</strong>
                <p>We visit the plot, check 30ft+ road access, verify boundaries, and capture actual site photos.</p>
              </div>
              <Check size={18} />
            </div>
            <div>
              <span>02</span>
              <div>
                <strong>Price per Sq. Yard Transparency</strong>
                <p>Clear rate breakdown based on prevailing Miyapur market realities, with explicit negotiability disclosures.</p>
              </div>
              <Check size={18} />
            </div>
            <div>
              <span>03</span>
              <div>
                <strong>Legal &amp; Title Diligence Facilitation</strong>
                <p>We review link documents, pattadar passbooks, and layout approvals without falsely claiming automatic legal clearance.</p>
              </div>
              <Check size={18} />
            </div>
            <div>
              <span>04</span>
              <div>
                <strong>Accompanied Site Visits</strong>
                <p>The founder coordinates and accompanies you on site visits to discuss ground realities directly.</p>
              </div>
              <Check size={18} />
            </div>
          </div>
        </section>

        {/* Due Diligence Field Notes */}
        <section className="journal-band">
          <span className="eyebrow">BUYER &amp; SELLER ADVISORY</span>
          <h2>Knowledge is your best<br /><em>protection in land deals.</em></h2>
          <p>Read our field notes on checking layout approvals (HMDA/GHMC/Gram Panchayat), obtaining Encumbrance Certificates, and verifying title deeds in Telangana.</p>
          <Link href="/guides" className="button button-outline-light">
            Read due diligence guides <MoveUpRight size={16} /></Link>
          <div className="journal-orbit">T.</div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
