import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Check, MoveUpRight } from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { allPropertyTypes } from "@/lib/market";
import { db, propertyFromRow } from "@/lib/db";

export const dynamic = "force-dynamic";

const places = [
  { city: "Shankarpally", area: "West Hyderabad", count: "42 listings", image: "photo-1510798831971-661eb04b3739" },
  { city: "Shadnagar", area: "South Hyderabad", count: "36 listings", image: "photo-1500382017468-9049fed747ef" },
  { city: "Anandapuram", area: "Visakhapatnam", count: "28 listings", image: "photo-1472396961693-142e6e269027" },
];

export default function Home() {
  const latestProperties = (db.prepare(`
    SELECT * FROM properties
    WHERE status = 'published' AND listingCategory = 'sale'
    ORDER BY createdAt DESC, rowid DESC
    LIMIT 3
  `).all() as Record<string, unknown>[]).map(propertyFromRow);

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
            <div className="hero-kicker"><span /> A CLEARER WAY TO FIND YOUR PLACE ACROSS INDIA</div>
            <h1>Find the place<br /><em>for what comes next.</em></h1>
            <p>Explore land and plots for sale, plus farmhouses, resorts, and other places to rent.</p>
            <form action="/search" className="hero-search">
              <label className="search-field"><span>LOCATION</span><input name="q" placeholder="City, state, neighbourhood or project" /></label>
              <label className="search-field type-field"><span>WHAT ARE YOU LOOKING FOR?</span><select name="type" defaultValue=""><option value="">Any property type</option>{allPropertyTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
              <button className="button button-dark search-submit" type="submit">Find a place <ArrowUpRight size={17} /></button>
            </form>
            <div className="hero-under"><span><Check size={14} /> Clear, detailed listings</span><Link href="/search?category=sale">Browse land for sale <ArrowUpRight size={14} /></Link></div>
          </div>
          <div className="hero-caption">LAND ACROSS <span>INDIA</span></div>
          <div className="hero-index"><span>01</span> — 03</div>
        </section>

        <section className="trust-strip">
          <span>THE LAND MARKETPLACE BUILT AROUND YOU</span>
          <div><strong>Clear listings.</strong> Real places. More confident decisions.</div>
          <Link href="/about">A better way to explore <ArrowUpRight size={15} /></Link>
        </section>

        <section className="section featured-section">
          <div className="section-heading">
          <div><span className="eyebrow">NEWLY LISTED FOR SALE</span><h2>Good ground,<br /><em>just added.</em></h2></div>
          <div className="section-aside"><p>See the latest published land and plots listed for sale across Terraland.</p><Link className="text-link" href="/search?category=sale">Explore land for sale <ArrowUpRight size={16} /></Link></div>
          </div>
          {latestProperties.length
            ? <div className="property-grid">{latestProperties.map((property) => <PropertyCard key={property.id} property={property} />)}</div>
            : <div className="empty-state"><h3>No published land listings yet.</h3><p>New sale listings will appear here as soon as they are published.</p><Link className="text-link" href="/search?category=sale">Browse land for sale <ArrowUpRight size={16} /></Link></div>}
        </section>

        <section className="section places-section">
          <div className="places-heading"><div><span className="eyebrow">FIND YOUR NEIGHBOURHOOD</span><h2>Good ground, <em>all around.</em></h2></div><Link className="text-link" href="/search?category=sale">See land for sale <ArrowUpRight size={16} /></Link></div>
          <div className="place-grid">{places.map((place, index) => <Link className={`place-card place-${index + 1}`} key={place.city} href={`/search?category=sale&q=${encodeURIComponent(place.city)}`} style={{ backgroundImage: `linear-gradient(180deg, transparent 30%, rgba(19,30,24,.7)),url(https://images.unsplash.com/${place.image}?auto=format&fit=crop&w=1000&q=85)` }}><span className="place-index">0{index + 1}</span><div><span>{place.area} · {place.count}</span><strong>{place.city}</strong></div><ArrowUpRight size={20} /></Link>)}</div>
        </section>

        <section className="seller-band">
          <div className="seller-copy"><span className="eyebrow">FOR PROPERTY OWNERS</span><h2>Good places deserve<br />a <em>good introduction.</em></h2><p>Meet buyers, renters, and guests looking for exactly what you have. Listing is simple, free, and always in your hands.</p><Link className="button button-cream" href="/sell">List your place for free <ArrowUpRight size={16} /></Link></div>
          <div className="seller-art"><div className="seller-art-image" /><div className="seller-stamp"><span>LAND<br />WELL<br />FOUND</span><ArrowDownRight size={20} /></div><div className="seller-side-note">YOUR NEXT MOVE<br />STARTS RIGHT HERE</div></div>
        </section>

        <section className="section assurance-section">
          <div className="assurance-intro"><span className="eyebrow">A LITTLE MORE CERTAINTY</span><h2>Because buying land<br />should feel <em>grounded.</em></h2><p>We make the details easier to understand, so you can focus on the possibilities.</p></div>
          <div className="assurance-list"><div><span>01</span><div><strong>Listings with the details that matter</strong><p>Location, land type, size, and price are clear from the start.</p></div><Check size={18} /></div><div><span>02</span><div><strong>Know who you&apos;re speaking with</strong><p>Seller information is shown upfront. No mystery handoffs.</p></div><Check size={18} /></div><div><span>03</span><div><strong>Your search, your pace</strong><p>Save interesting places, ask questions, and compare on your terms.</p></div><Check size={18} /></div></div>
        </section>

        <section className="journal-band"><span className="eyebrow">THE FIELD NOTES</span><h2>A little knowledge<br />goes a <em>long way.</em></h2><p>Useful thoughts on buying land, checking documents, and getting to know a place before you call it yours.</p><Link href="/guides" className="button button-outline-light">Read the field notes <MoveUpRight size={16} /></Link><div className="journal-orbit">T.</div></section>
      </main>
      <SiteFooter />
    </>
  );
}
