"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  listingCategories,
  pricePeriodsByCategory,
  propertyTypes,
  rentalTypes,
  type ListingCategory,
  type PricePeriod,
} from "@/lib/market";

function typesForCategory(category: ListingCategory) {
  if (category === "rent") return rentalTypes;
  return propertyTypes;
}

export function ListingClassificationFields({ category, type, pricePeriod, categoryFields }: {
  category: ListingCategory;
  type: string;
  pricePeriod: PricePeriod;
  categoryFields?: (category: ListingCategory) => ReactNode;
}) {
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [selectedType, setSelectedType] = useState(type);
  const [selectedPeriod, setSelectedPeriod] = useState(pricePeriod);
  const propertyOptions = typesForCategory(selectedCategory);

  return <>
    <label>Listing type<select name="listingCategory" value={selectedCategory} onChange={(event) => {
      const nextCategory = event.target.value as ListingCategory;
      setSelectedCategory(nextCategory);
      setSelectedType(typesForCategory(nextCategory)[0]);
      setSelectedPeriod(pricePeriodsByCategory[nextCategory][0].value);
    }}>{listingCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
    <label>Property type<select name="type" value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
      {!propertyOptions.includes(selectedType) && <option value={selectedType}>{selectedType}</option>}
      {propertyOptions.map((item) => <option key={item}>{item}</option>)}
    </select></label>
    <label>Rate period<select name="pricePeriod" value={selectedPeriod} onChange={(event) => setSelectedPeriod(event.target.value as PricePeriod)}>
      {pricePeriodsByCategory[selectedCategory].map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select></label>
    {categoryFields?.(selectedCategory)}
  </>;
}
