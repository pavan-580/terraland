// Transparent rule-based match calculator (NO black-box AI)

export interface BuyerRequirementMatchInput {
  id: string;
  preferredLocation: string;
  minBudget: number;
  maxBudget: number;
  minPlotSize: number;
  maxPlotSize: number;
  intendedUse: string;
}

export interface PropertyMatchInput {
  id: string;
  title: string;
  locality: string;
  city: string;
  price: number;
  area: number;
  unit: string;
  isNegotiable?: string;
}

export function evaluateTransparentMatch(
  requirement: BuyerRequirementMatchInput,
  property: PropertyMatchInput
): { score: number; explanations: string[] } | null {
  const explanations: string[] = [];
  let score = 0;

  // 1. Locality & Corridor Match
  const reqLoc = (requirement.preferredLocation || "").toLowerCase().trim();
  const propLoc = (property.locality || "").toLowerCase().trim();
  const propCity = (property.city || "").toLowerCase().trim();

  // Hyderabad West / Miyapur corridor localities
  const miyapurCorridor = [
    "miyapur",
    "bachupally",
    "ameenpur",
    "chandanagar",
    "madinaguda",
    "nizampet",
    "bollarum",
    "kukatpally",
    "patancheru",
    "beeramguda",
    "tellapur",
  ];

  if (
    reqLoc.includes(propLoc) ||
    propLoc.includes(reqLoc) ||
    (reqLoc.includes("miyapur") && propLoc.includes("miyapur"))
  ) {
    score += 40;
    explanations.push(`Exact locality match (${property.locality}) [+40 pts]`);
  } else if (
    miyapurCorridor.some((c) => reqLoc.includes(c)) &&
    miyapurCorridor.some((c) => propLoc.includes(c))
  ) {
    score += 25;
    explanations.push(`Adjacent Miyapur-West corridor locality (${property.locality}) [+25 pts]`);
  } else if (propCity.includes("hyderabad") && reqLoc.includes("hyderabad")) {
    score += 10;
    explanations.push(`Same metropolitan region (${property.city}) [+10 pts]`);
  }

  // 2. Budget Match
  const minB = requirement.minBudget || 0;
  const maxB = requirement.maxBudget || 0;
  const price = property.price || 0;
  const isNegotiable =
    property.isNegotiable === "negotiable" ||
    property.isNegotiable === "slightly_negotiable" ||
    property.isNegotiable === "yes";

  if (maxB > 0) {
    if (price >= minB && price <= maxB) {
      score += 35;
      explanations.push(
        `Price ₹${price.toLocaleString("en-IN")} is directly within buyer budget (₹${minB.toLocaleString("en-IN")} - ₹${maxB.toLocaleString("en-IN")}) [+35 pts]`
      );
    } else if (isNegotiable && price <= maxB * 1.15) {
      score += 25;
      explanations.push(
        `Price ₹${price.toLocaleString("en-IN")} is within 15% negotiation threshold of buyer budget [+25 pts]`
      );
    } else if (price <= maxB * 1.25) {
      score += 15;
      explanations.push(`Price ₹${price.toLocaleString("en-IN")} is within 25% tolerance [+15 pts]`);
    } else if (price < minB && price >= minB * 0.7) {
      score += 20;
      explanations.push(
        `Price ₹${price.toLocaleString("en-IN")} is below buyer's maximum budget (value deal) [+20 pts]`
      );
    }
  } else if (minB > 0 && price >= minB) {
    score += 25;
    explanations.push(`Price ₹${price.toLocaleString("en-IN")} meets minimum threshold [+25 pts]`);
  } else {
    score += 15;
    explanations.push("Flexible budget constraint [+15 pts]");
  }

  // 3. Plot Size Match
  const minA = requirement.minPlotSize || 0;
  const maxA = requirement.maxPlotSize || 0;
  const area = property.area || 0;

  if (maxA > 0) {
    if (area >= minA && area <= maxA) {
      score += 25;
      explanations.push(
        `Plot area ${area} ${property.unit} satisfies buyer size requirement (${minA} - ${maxA}) [+25 pts]`
      );
    } else if (area >= minA * 0.8 && area <= maxA * 1.25) {
      score += 15;
      explanations.push(`Plot area ${area} ${property.unit} is within 20% size variance [+15 pts]`);
    }
  } else if (minA > 0 && area >= minA) {
    score += 20;
    explanations.push(`Plot area ${area} ${property.unit} meets minimum area requirement [+20 pts]`);
  } else {
    score += 10;
    explanations.push("Flexible plot size constraint [+10 pts]");
  }

  // Only return if there is meaningful correlation
  if (score < 40) return null;

  return { score: Math.min(score, 100), explanations };
}

