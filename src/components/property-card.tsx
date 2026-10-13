import Link from "next/link";
import { ArrowUpRight, BadgeCheck, MapPin } from "lucide-react";
import type { Property } from "@/lib/market";
import { formatListingPrice } from "@/lib/market";
import { SaveButton } from "@/components/save-button";
import { SellerPhoneLink } from "@/components/seller-phone-link";
import { WhatsAppListingLink } from "@/components/whatsapp-listing-link";

export function PropertyCard({ property }: { property: Property }) {
  return (
    <article className="property-card">
      <Link className="card-image" href={`/properties/${property.id}`} style={{ backgroundImage: `url("${property.images?.[0] ?? property.image}")` }} aria-label={`View ${property.title}`}>
        <span className="property-badge">{property.badge}</span>
      </Link>
      <div className="card-details">
        <div className="card-topline"><span>{property.listingCategory === "rent" ? "For rent" : "For sale"} · {property.type}</span><SaveButton propertyId={property.id} /></div>
        <Link href={`/properties/${property.id}`} className="property-title" translate="no">{property.title}</Link>
        <div className="property-place"><MapPin size={14} /> {property.locality}, {property.city}</div>
        <div className="card-seller-contact"><div><span>{property.owner === "NILAY" ? "Enquiries through" : "Seller"}</span><strong>{property.owner}</strong></div>{property.phone && <div className="card-seller-links"><SellerPhoneLink propertyId={property.id} phone={property.phone} owner={property.owner}>{property.phone}</SellerPhoneLink></div>}</div>
        <div className="card-divider" />
        <div className="card-bottom">
          <div><strong>{formatListingPrice(property)}</strong><span>{property.area} {property.unit}</span></div>
          <div className="card-actions"><WhatsAppListingLink property={property} /><Link href={`/properties/${property.id}`} className="card-arrow" aria-label={`View ${property.title}`}><ArrowUpRight size={17} /></Link></div>
        </div>
        {property.verified && <div className="verified-note"><BadgeCheck size={13} /> Seller details reviewed</div>}
      </div>
    </article>
  );
}
