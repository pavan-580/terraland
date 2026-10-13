export type Property = {
  id: string;
  title: string;
  type: string;
  listingCategory?: ListingCategory;
  pricePeriod?: PricePeriod;
  availability?: string;
  guestCapacity?: number;
  city: string;
  locality: string;
  price: number;
  area: number;
  unit: string;
  image: string;
  images?: string[];
  videos?: string[];
  badge: string;
  description: string;
  owner: string;
  phone: string;
  showPhone?: boolean;
  sellerEmail?: string;
  facing?: string;
  approvals?: string;
  loanAvailable?: string;
  registrationAvailable?: string;
  renovation?: string;
  cornerPlot?: string;
  roadWidth?: string;
  surveyNumber?: string;
  soilType?: string;
  clearTitle?: string;
  amenities?: string[];
  address?: string;
  landmark?: string;
  mapUrl?: string;
  verified: boolean;
  status?: "published" | "hidden";
  deleteRequestedAt?: string | null;
  createdAt?: string;
};

export function parseListingArea(value: unknown): number | null {
  const areaText = String(value ?? "").trim().replace(/[\s,]/g, "");
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(areaText)) return null;
  const area = Number(areaText);
  return Number.isFinite(area) && area > 0 ? area : null;
}

export type ListingCategory = "sale" | "rent";
export type PricePeriod = "total" | "per-day" | "per-night" | "per-month" | "per-event";

export function isListingCategory(value: string): value is ListingCategory {
  return value === "sale" || value === "rent";
}

export const listingCategories: { value: ListingCategory; label: string }[] = [
  { value: "sale", label: "For sale" },
  { value: "rent", label: "For rent" },
];

export const pricePeriodsByCategory: Record<ListingCategory, { value: PricePeriod; label: string }[]> = {
  sale: [{ value: "total", label: "Total price" }],
  rent: [
    { value: "per-day", label: "Per day" },
    { value: "per-night", label: "Per night" },
    { value: "per-month", label: "Per month" },
    { value: "per-event", label: "Per event" },
  ],
};
export const pricePeriods = Object.values(pricePeriodsByCategory)
  .flat()
  .filter((period, index, periods) => periods.findIndex((candidate) => candidate.value === period.value) === index);

export const amenityGroups = [
  { title: "Land & site", items: ["Road access", "Electricity", "Water supply", "Borewell", "Farm irrigation", "Fencing", "Boundary wall", "Drainage", "Gated layout"] },
  { title: "Community & security", items: ["24/7 security", "CCTV", "Street lighting", "Park / open space", "Children's play area", "Clubhouse", "Gym"] },
  { title: "Stay & comfort", items: ["Parking", "Power backup", "Garden / lawn", "Wi-Fi", "Air conditioning", "Kitchen", "Dining area", "Swimming pool", "Caretaker", "Housekeeping", "Pet friendly"] },
  { title: "Recreation & access", items: ["Indoor games", "Outdoor games", "Event space", "Campfire / barbecue", "Nature / lake view", "Private access", "Restrooms", "Public transport nearby", "Farmhouse"] },
] as const;

export const amenityOptions = amenityGroups.flatMap((group) => group.items);

export const seedProperties: Property[] = [
  {
    id: "land-101",
    title: "A quieter kind of investment",
    type: "Gated community plot",
    city: "Hyderabad",
    locality: "Shankarpally",
    price: 4250000,
    area: 200,
    unit: "sq. yd.",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1100&q=85",
    badge: "RERA approved",
    description: "A thoughtfully planned residential plot in a fast-growing corridor west of Hyderabad. Wide internal roads, clear title, and utilities at the site.",
    owner: "Arjun Reddy",
    phone: "+91 98499 67236",
    verified: true,
  },
  {
    id: "land-102",
    title: "Room to grow, close to the city",
    type: "Farm land",
    city: "Hyderabad",
    locality: "Mokila",
    price: 7800000,
    area: 1,
    unit: "acre",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1100&q=85&sat=-35",
    badge: "Title checked",
    description: "Open, level agricultural land with road access and a peaceful setting. Ideal for a weekend retreat or a long-term land investment.",
    owner: "Kavya Estates",
    phone: "+91 98499 67237",
    verified: true,
  },
  {
    id: "land-103",
    title: "Your next chapter starts here",
    type: "Residential plot",
    city: "Hyderabad",
    locality: "Shadnagar",
    price: 1850000,
    area: 150,
    unit: "sq. yd.",
    image: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1100&q=85",
    badge: "HMDA layout",
    description: "A well-connected plot in an established layout with clear documentation and a straightforward purchase process.",
    owner: "Srinivas Kumar",
    phone: "+91 98499 67238",
    verified: true,
  },
  {
    id: "land-104",
    title: "A little more space for your plans",
    type: "Agricultural land",
    city: "Visakhapatnam",
    locality: "Anandapuram",
    price: 3600000,
    area: 0.5,
    unit: "acre",
    image: "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1100&q=85",
    badge: "Owner listed",
    description: "A gently sloping parcel in a green setting on the outskirts of Vizag, with approach road and documentation ready to review.",
    owner: "Pranavi Properties",
    phone: "+91 98499 67239",
    verified: false,
  },
];

export const cities = ["Hyderabad", "Visakhapatnam", "Vijayawada", "Warangal", "Sangareddy"];
export const propertyTypes = ["Residential plot", "Gated community plot", "Farm land", "Agricultural land", "Commercial land"];
export const rentalTypes = [
  "Farmhouse", "Resort", "Private land", "Event venue", "Villa", "Luxury villa",
  "Private estate", "Farm stay", "Other property", "Other luxury rental",
];
export const allPropertyTypes = [...new Set([...propertyTypes, ...rentalTypes])];

export function isPropertyTypeForCategory(category: ListingCategory, type: string) {
  if (category === "rent") return rentalTypes.includes(type);
  return !rentalTypes.includes(type);
}
const googleMapsHosts = new Set([
  "google.com",
  "www.google.com",
  "maps.google.com",
  "google.co.in",
  "www.google.co.in",
  "maps.google.co.in",
  "maps.app.goo.gl",
  "goo.gl",
]);

export function isGoogleMapsUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !googleMapsHosts.has(url.hostname.toLowerCase())) return false;
    if (url.hostname.endsWith("goo.gl")) return url.pathname.length > 1;
    return url.pathname.startsWith("/maps") ||
      (url.searchParams.has("api") && url.searchParams.get("api") === "1");
  } catch {
    return false;
  }
}

export const formatPrice = (price: number) =>
  price >= 10000000
    ? `₹${(price / 10000000).toFixed(price % 10000000 ? 2 : 0)} Cr`
    : `₹${(price / 100000).toFixed(price % 100000 ? 1 : 0)} L`;

export function formatListingPrice(property: Pick<Property, "price" | "listingCategory" | "pricePeriod">) {
  if (!property.listingCategory || property.listingCategory === "sale") return formatPrice(property.price);
  const periodLabels: Record<Exclude<PricePeriod, "total">, string> = {
    "per-day": "day",
    "per-night": "night",
    "per-month": "month",
    "per-event": "event",
  };
  const period = property.pricePeriod && property.pricePeriod !== "total" ? periodLabels[property.pricePeriod] : "night";
  return `${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(property.price)} / ${period}`;
}
