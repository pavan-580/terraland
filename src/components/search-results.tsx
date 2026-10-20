"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { listingCategories, propertyTypes, rentalTypes, type ListingCategory, type Property } from "@/lib/market";

export function SearchResults({ initial, initialProperties = [] }: { initial: { q: string; city: string; type: string; category?: string; locality?: string }; initialProperties?: Property[] }) {
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [q, setQ] = useState(initial.q);
  const [city, setCity] = useState(initial.city || "");
  const [locality, setLocality] = useState(initial.locality || "");
  const [type, setType] = useState(initial.type);
  const [category, setCategory] = useState<ListingCategory>(initial.category === "rent" ? "rent" : "sale");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");

  const propertyOptions = [...new Map([...(category === "rent" ? rentalTypes : propertyTypes), type, ...properties.map((property) => property.type)]
    .filter((item): item is string => Boolean(item?.trim())).map((item) => [item.toLocaleLowerCase(), item])).values()];

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (city) params.set("city", city);
    if (locality) params.set("locality", locality);
    if (type) params.set("type", type);
    if (category) params.set("category", category);
    if (sort) params.set("sort", sort);

    const priceScale = category === "sale" || !category ? 100000 : 1;
    if (min) params.set("min", String(Number(min) * priceScale));
    if (max) params.set("max", String(Number(max) * priceScale));
    if (minArea) params.set("minArea", minArea);
    if (maxArea) params.set("maxArea", maxArea);

    try {
      const response = await fetch(`/api/properties?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Listings could not be loaded. Please try again.");
      setProperties(await response.json() as Property[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Listings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [q, city, locality, type, category, min, max, minArea, maxArea, sort]);

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

  return (
    <>
      <SiteHeader />
      <main className="search-page">
        <div className="results-layout">
          <div className="search-sticky-toolbar" aria-label="Search tools">
            <BackButton className="search-back-link" fallbackHref="/" label="Back to home" />
            <button
              type="button"
              className={`mobile-filter-toggle search-toolbar-filter${hasSearched ? " is-compact" : ""}`}
              aria-label={filtersOpen ? "Close search filters" : "Open search filters"}
              aria-expanded={filtersOpen}
              aria-controls="search-filter-panel"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              {hasSearched ? <Search size={17} /> : <SlidersHorizontal size={16} />}
              <span>Filters</span>
              <ChevronDown size={14} className={filtersOpen ? "is-rotated" : ""} />
            </button>
            <div className="sort-dropdown-wrap search-toolbar-sort">
              <ArrowUpDown size={13} className="sort-icon" />
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="sort-select" aria-label="Sort listings">
                <option value="recent">Recent</option>
                <option value="price_asc">Price: Low</option>
                <option value="price_desc">Price: High</option>
                <option value="area_asc">Size: Small</option>
              </select>
              <ChevronDown size={13} className="sort-chevron" />
            </div>
          </div>

          <aside id="search-filter-panel" className={`filter-panel${filtersOpen ? " is-open" : ""}`} aria-label="Search filters">
            <div className="filter-title">
              <strong>Refine plot search</strong>
              <SlidersHorizontal size={17} />
            </div>

            <label className="filter-label">
              KEYWORDS
              <input
                autoComplete="off"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") submitSearch(); }}
                placeholder="e.g. “Miyapur Metro”, “HMDA”"
              />
            </label>

            <label className="filter-label">
              LOCALITY / CORRIDOR
              <input
                autoComplete="off"
                value={locality}
                onChange={(event) => setLocality(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") submitSearch(); }}
                placeholder="e.g. Miyapur, Bachupally, Ameenpur"
              />
            </label>

            <label className="filter-label">
              CITY / REGION
              <input
                autoComplete="off"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") submitSearch(); }}
                placeholder="Hyderabad"
              />
            </label>

            <label className="filter-label">
              LISTING TYPE
              <span className="select-wrap">
                <select
                  value={category}
                  onChange={(event) => {
                    const nextCategory = event.target.value as ListingCategory;
                    setCategory(nextCategory);
                    if (!(nextCategory === "rent" ? rentalTypes : propertyTypes).includes(type)) setType("");
                  }}
                >
                  {listingCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <ChevronDown size={14} />
              </span>
            </label>

            <label className="filter-label">
              PROPERTY TYPE
              <span className="select-wrap">
                <select value={type} onChange={(event) => setType(event.target.value)}>
                  <option value="">All property types</option>
                  {propertyOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <ChevronDown size={14} />
              </span>
            </label>

            <div className="filter-label">
              BUDGET RANGE <span className="filter-hint">{category === "sale" || !category ? "in lakhs ₹" : "in ₹"}</span>
            </div>
            <div className="price-inputs">
              <input
                type="number"
                min="0"
                placeholder="Min"
                value={min}
                onChange={(event) => setMin(event.target.value)}
              />
              <span>—</span>
              <input
                type="number"
                min="0"
                placeholder="Max"
                value={max}
                onChange={(event) => setMax(event.target.value)}
              />
            </div>

            <div className="filter-label">
              PLOT SIZE <span className="filter-hint">in sq. yds</span>
            </div>
            <div className="price-inputs">
              <input
                type="number"
                min="0"
                step="10"
                placeholder="Min (e.g. 150)"
                value={minArea}
                onChange={(event) => setMinArea(event.target.value)}
              />
              <span>—</span>
              <input
                type="number"
                min="0"
                step="10"
                placeholder="Max (e.g. 500)"
                value={maxArea}
                onChange={(event) => setMaxArea(event.target.value)}
              />
            </div>

            <button className="button button-dark filter-button" onClick={submitSearch}>
              Filter plots <ArrowUpRight size={16} />
            </button>

            <button
              className="reset-button"
              onClick={() => {
                setQ("");
                setCity("");
                setLocality("");
                setType("");
                setCategory("sale");
                setMin("");
                setMax("");
                setMinArea("");
                setMaxArea("");
                setSort("recent");
              }}
            >
              Clear all filters
            </button>

            <div className="filter-help">
              <span>Looking for offline inventory?</span>
              <Link href="/requirements" className="register-req-link">
                Register Plot Requirement <ArrowUpRight size={14} />
              </Link>
            </div>
          </aside>

          <section className="results-main">
            <div className="results-header">
              <div>
                <span className="eyebrow">{(locality || city || "TELANGANA").toLocaleUpperCase()} {category === "rent" ? "LAND & RENTALS" : "RESIDENTIAL PLOTS"}</span>
                <h1 className="results-page-title">
                  {`Plots ${category === "rent" ? "for rent" : "for sale"}${locality || city ? ` in ${locality || city}` : " across Telangana and Andhra Pradesh"}`}
                </h1>
                <div className="results-availability-row">
                  <h2>
                    {loading
                      ? "Searching verified plots…"
                      : `${properties.length} ${properties.length === 1 ? "plot" : "plots"} available`}
                  </h2>
                  <Link href="/requirements" className="results-requirement-link">Register your plot requirement <ArrowUpRight size={14} /></Link>
                </div>
              </div>
            </div>

            {/* Interactive Corridor & Budget Quick Filter Bar */}
            <div className="search-quick-corridors">
              <span className="quick-label">Corridors:</span>
              {[
                { label: "All", value: "" },
                { label: "Miyapur", value: "Miyapur" },
                { label: "Bachupally", value: "Bachupally" },
                { label: "Ameenpur", value: "Ameenpur" },
                { label: "Chandanagar", value: "Chandanagar" },
                { label: "Nizampet", value: "Nizampet" },
                { label: "Tellapur", value: "Tellapur" },
              ].map((c) => (
                <button
                  key={c.label}
                  type="button"
                  className={`quick-corridor-btn ${locality.toLowerCase() === c.value.toLowerCase() ? "is-active" : ""}`}
                  onClick={() => setLocality(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="search-quick-corridors search-quick-budgets">
              <span className="quick-label">Budget:</span>
              {[
                { label: "All", minVal: "", maxVal: "" },
                { label: "< ₹10 Lakhs", minVal: "", maxVal: "10" },
                { label: "₹10L - ₹25L", minVal: "10", maxVal: "25" },
                { label: "₹25L - ₹50L", minVal: "25", maxVal: "50" },
                { label: "₹50L - ₹1 Cr", minVal: "50", maxVal: "100" },
                { label: "₹1 Cr - ₹2 Cr", minVal: "100", maxVal: "200" },
                { label: "> ₹2 Cr", minVal: "200", maxVal: "" },
              ].map((b) => {
                const isActive = min === b.minVal && max === b.maxVal;
                return (
                  <button
                    key={b.label}
                    type="button"
                    className={`quick-corridor-btn ${isActive ? "is-active" : ""}`}
                    onClick={() => {
                      setMin(b.minVal);
                      setMax(b.maxVal);
                    }}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>

            {error && <div className="form-error">{error}</div>}

            {loading ? (
              <div className="loading-state">Finding verified residential plots in Hyderabad…</div>
            ) : properties.length ? (
              <div className="property-grid results-grid">
                {properties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span>VERIFIED PLOTS ONLY</span>
                <h3>No published listings match this criteria right now.</h3>
                <p>
                  Terraland does not show fake listings. We verify every plot title and inspect the site before publishing.
                  If you don&apos;t see what you need, submit your requirement and our founder will match you with upcoming or direct-owner plots in the Miyapur corridor.
                </p>
                <div className="empty-state-actions">
                  <Link href="/requirements" className="button button-dark">
                    Register Your Plot Requirement <ArrowUpRight size={16} />
                  </Link>
                  <button
                    className="button button-outline"
                    onClick={() => {
                      setQ("");
                      setCity("");
                      setLocality("");
                      setType("");
                      setMin("");
                      setMax("");
                      setMinArea("");
                      setMaxArea("");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
