"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listingCategories, propertyTypes, rentalTypes, type ListingCategory, type Property } from "@/lib/market";

export function SearchResults({ initial }: { initial: { q: string; city: string; type: string; category?: string } }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [q, setQ] = useState(initial.q);
  const [city, setCity] = useState(initial.city);
  const [type, setType] = useState(initial.type);
  const [category, setCategory] = useState<ListingCategory>(initial.category === "rent" ? "rent" : "sale");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");
  const propertyOptions = category === "rent" ? rentalTypes : propertyTypes;
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (city) params.set("city", city);
    if (type) params.set("type", type);
    if (category) params.set("category", category);
    const priceScale = category === "sale" || !category ? 100000 : 1;
    if (min) params.set("min", String(Number(min) * priceScale));
    if (max) params.set("max", String(Number(max) * priceScale));
    try {
      const response = await fetch(`/api/properties?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Listings could not be loaded. Please try again.");
      setProperties(await response.json() as Property[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Listings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [q, city, type, category, min, max]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const refreshContacts = () => { void load(); };
    window.addEventListener("terraland:account-changed", refreshContacts);
    return () => window.removeEventListener("terraland:account-changed", refreshContacts);
  }, [load]);
  const submitSearch = () => {
    setHasSearched(true);
    setFiltersOpen(false);
    void load();
  };
  return <><SiteHeader /><main className="search-page">
    <div className="results-layout">
      <button type="button" className={`mobile-filter-toggle${hasSearched ? " is-compact" : ""}`} aria-label={filtersOpen ? "Close search filters" : "Open search filters"} aria-expanded={filtersOpen} aria-controls="search-filter-panel" onClick={() => setFiltersOpen((open) => !open)}>{hasSearched ? <Search size={18} /> : <SlidersHorizontal size={17} />}<span>{hasSearched ? "Search filters" : "Refine your search"}</span><ChevronDown size={16} className={filtersOpen ? "is-rotated" : ""} /></button>
      <aside id="search-filter-panel" className={`filter-panel${filtersOpen ? " is-open" : ""}`} aria-label="Search filters">
        <div className="filter-title"><strong>Refine your search</strong><SlidersHorizontal size={17} /></div>
        <label className="filter-label">KEYWORDS<input autoComplete="off" value={q} onChange={(event) => setQ(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitSearch(); }} placeholder="Try “Shankarpally”" /></label>
        <label className="filter-label">LOCATION<input autoComplete="off" value={city} onChange={(event) => setCity(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitSearch(); }} placeholder="Any city or state in India" /></label>
        <label className="filter-label">LISTING TYPE<span className="select-wrap"><select value={category} onChange={(event) => {
          const nextCategory = event.target.value as ListingCategory;
          setCategory(nextCategory);
          if (!(nextCategory === "rent" ? rentalTypes : propertyTypes).includes(type)) setType("");
        }}>{listingCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><ChevronDown size={14} /></span></label>
        <label className="filter-label">PROPERTY TYPE<span className="select-wrap"><select value={type} onChange={(event) => setType(event.target.value)}><option value="">All property types</option>{propertyOptions.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></span></label>
        <div className="filter-label">PRICE RANGE <span className="filter-hint">{category === "sale" || !category ? "in lakhs" : "in ₹"}</span></div>
        <div className="price-inputs"><input type="number" min="0" placeholder="Min" value={min} onChange={(event) => setMin(event.target.value)} /><span>—</span><input type="number" min="0" placeholder="Max" value={max} onChange={(event) => setMax(event.target.value)} /></div>
        <button className="button button-dark filter-button" onClick={submitSearch}>Show places <ArrowUpRight size={16} /></button>
        <button className="reset-button" onClick={() => { setQ(""); setCity(""); setType(""); setCategory("sale"); setMin(""); setMax(""); }}>Clear all filters</button>
        <div className="filter-help"><span>Need a hand?</span><a href="https://wa.me/918074399963?text=Hello%20NILAY%2C%20I%20need%20help." target="_blank" rel="noopener noreferrer">Talk to our team <ArrowUpRight size={14} /></a></div>
      </aside>
      <section className="results-main">
        <div className="results-header"><div><span className="eyebrow">GOOD PLACES, REAL POSSIBILITIES</span><h2>{loading ? "Finding your place…" : `${properties.length} ${properties.length === 1 ? "place" : "places"} to explore`}</h2></div><span className="sort-note">Curated for you <ChevronDown size={15} /></span></div>
        {error && <div className="form-error">{error}</div>}
        {loading ? <div className="loading-state">A moment while we find the right place for you…</div> : properties.length ? <div className="property-grid results-grid">{properties.map((property) => <PropertyCard key={property.id} property={property} />)}</div> : <div className="empty-state"><span>NO PLACES FOUND</span><h3>{category === "rent" && type ? `No ${type} rentals yet.` : category === "rent" ? "No rentals listed yet." : "No sale listings found."}</h3><p>{category === "rent" ? "Rental listings are kept separate from land for sale. Try another rental type or browse all rentals." : "Try widening your search or clearing a filter. Sale listings remain separate from rentals."}</p><button className="button button-dark" onClick={() => { setQ(""); setCity(""); setType(""); setMin(""); setMax(""); }}>{category === "rent" ? "Show all rentals" : "Show sale listings"} <ArrowUpRight size={16} /></button></div>}
      </section>
    </div>
  </main><SiteFooter /></>;
}
