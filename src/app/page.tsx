import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Check, MoveUpRight } from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { allPropertyTypes } from "@/lib/market";
import { db, getSiteSetting, publicPropertyFromRow } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const places = [
  { city: "Shankarpally", area: "West Hyderabad", count: "42 listings", image: "photo-1510798831971-661eb04b3739" },
  { city: "Shadnagar", area: "South Hyderabad", count: "36 listings", image: "photo-1500382017468-9049fed747ef" },
  { city: "Anandapuram", area: "Visakhapatnam", count: "28 listings", image: "photo-1472396961693-142e6e269027" },
];

export default async function Home() {
  const user = await currentUser();
  const latestProperties = (db.prepare(`
    SELECT properties.*, users.email AS sellerEmail FROM properties
    LEFT JOIN users ON users.id = properties.ownerId
    WHERE properties.status = 'published' AND properties.listingCategory = 'sale'
    ORDER BY properties.createdAt DESC, properties.rowid DESC
    LIMIT 3
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
          <div className="section-aside"><p>See the latest published land and plots listed for sale across NILAY.</p><Link className="text-link" href="/search?category=sale">Explore land for sale <ArrowUpRight size={16} /></Link></div>
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
          <div className="seller-copy"><span className="eyebrow">FOR PROPERTY OWNERS</span><h2>List your place.<br /><em>Find your people.</em></h2><p>Reach buyers, renters, and guests across India. Listing is free.</p><div className="seller-actions"><Link className="button button-cream" href="/sell">List for free <ArrowUpRight size={16} /></Link><a className="seller-whatsapp" href="https://wa.me/918074399963?text=Hello%20NILAY%2C%20I%20want%20to%20post%20my%20property." target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.52 3.48A11.8 11.8 0 0 0 12.12 0C5.58 0 .25 5.32.25 11.87c0 2.09.55 4.13 1.59 5.93L.15 24l6.35-1.66a11.9 11.9 0 0 0 5.62 1.43h.01c6.55 0 11.88-5.33 11.88-11.88a11.8 11.8 0 0 0-3.49-8.41ZM12.13 21.75a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.77.99 1.01-3.68-.23-.38a9.84 9.84 0 0 1-1.51-5.22c0-5.45 4.44-9.88 9.89-9.88a9.82 9.82 0 0 1 7 2.9 9.82 9.82 0 0 1 2.89 7c0 5.45-4.44 9.88-9.88 9.88Zm5.42-7.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z"/></svg><span>Post via WhatsApp</span><ArrowUpRight size={16} /></a></div></div>
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
