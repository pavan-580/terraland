"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Property } from "@/lib/market";
import { formatListingPrice } from "@/lib/market";
import { ListingClassificationFields } from "@/components/listing-classification-fields";
import { uploadPropertyPhotos } from "@/lib/upload-property-photos";

export function MyListings() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [photoProgress, setPhotoProgress] = useState<{ listingId: string; uploaded: number; total: number } | null>(null);

  async function load() {
    try {
      const response = await fetch("/api/my-listings");
      const result: unknown = await response.json();
      if (!response.ok) {
        const body = result as { error?: string };
        throw new Error(body.error ?? "Your listings could not be loaded.");
      }
      setProperties(result as Property[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your listings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>, property: Property) {
    event.preventDefault();
    setBusyId(property.id);
    setError("");
    setMessage("");
    setPhotoProgress(null);
    try {
      const formData = new FormData(event.currentTarget);
      const photos = formData.getAll("photos").filter((file): file is File => file instanceof File && file.size > 0);
      if (photos.length) {
        const photoUrls = await uploadPropertyPhotos(photos, (uploaded, total) => setPhotoProgress({ listingId: property.id, uploaded, total }));
        formData.delete("photos");
        formData.set("photoUrls", JSON.stringify(photoUrls));
      }
      const response = await fetch(`/api/properties/${encodeURIComponent(property.id)}`, {
        method: "PATCH",
        body: formData,
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Your listing could not be updated.");
      setMessage(result.message ?? "Your listing has been updated.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your listing could not be updated.");
    } finally {
      setBusyId("");
      setPhotoProgress(null);
    }
  }

  async function remove(property: Property) {
    if (!window.confirm(`Delete "${property.title}"? This cannot be undone.`)) return;
    setBusyId(property.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(property.id)}`, { method: "DELETE" });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Your listing could not be deleted.");
      setMessage(result.message ?? "Your listing has been deleted.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your listing could not be deleted.");
    } finally {
      setBusyId("");
    }
  }

  return <section className="my-listings">
    {error && <div className="form-error" role="alert">{error}</div>}
    {message && <div className="admin-success" role="status">{message}</div>}
    {loading ? <div className="loading-state">Loading your listings…</div> :
      properties.length ? <div className="my-listings-grid">{properties.map((property) =>
        <form className="my-listing-card" key={property.id} onSubmit={(event) => void save(event, property)}>
          <div className="my-listing-top">
            <div className="my-listing-image" style={{ backgroundImage: `url("${property.images?.[0] ?? property.image}")` }} />
            <div className="my-listing-title">
              <span className="eyebrow">{property.status === "hidden" ? "HIDDEN" : "PUBLISHED"} · {property.listingCategory === "rent" ? "FOR RENT" : "FOR SALE"} · {property.locality}, {property.city}</span>
              <strong translate="no">{property.title}</strong>
              <span className="my-listing-price">{formatListingPrice(property)} · {property.area} {property.unit}</span>
              <Link href={`/properties/${encodeURIComponent(property.id)}`}>View listing <ArrowUpRight size={14} /></Link>
            </div>
          </div>
          <details className="my-listing-editor">
            <summary><span>Edit listing details and photos</span><small>Changes are saved only when you select Save changes.</small></summary>
            <div className="my-listing-editor-content">
              <p className="my-listing-instructions">Update the information customers see. Your current photos stay in place unless you choose replacement photos below.</p>
              <div className="my-listing-current-photos" aria-label={`${property.images?.length ?? 1} current listing photos`}>
                {(property.images?.length ? property.images : [property.image]).map((image, index) => <div key={`${image}-${index}`} role="img" aria-label={`Current listing photo ${index + 1}`} style={{ backgroundImage: `url("${image}")` }} />)}
              </div>
              <div className="my-listing-fields">
            <label>Listing title<input name="title" required minLength={4} maxLength={100} defaultValue={property.title} /></label>
            <ListingClassificationFields category={property.listingCategory ?? "sale"} type={property.type} pricePeriod={property.pricePeriod ?? "total"}
              categoryFields={(category) => category === "rent" ? <>
                <label className="my-listing-wide">Availability / rental terms<input name="availability" maxLength={240} defaultValue={property.availability ?? ""} placeholder="e.g. Available year-round; minimum 2 nights" /></label>
                <label>Guest capacity<input name="guestCapacity" type="number" min="1" max="1000" step="1" defaultValue={property.guestCapacity ?? ""} placeholder="Optional" /></label>
              </> : <>
                <label>Facing<input name="facing" maxLength={40} defaultValue={property.facing ?? ""} /></label>
                <label>Road width<input name="roadWidth" maxLength={40} defaultValue={property.roadWidth ?? ""} /></label>
                <label>Approvals<input name="approvals" maxLength={120} defaultValue={property.approvals ?? ""} /></label>
                <label>Survey number<input name="surveyNumber" maxLength={80} defaultValue={property.surveyNumber ?? ""} /></label>
                <label>Soil type<input name="soilType" maxLength={80} defaultValue={property.soilType ?? ""} /></label>
                <label>Renovation / condition<input name="renovation" maxLength={120} defaultValue={property.renovation ?? ""} /></label>
                <label>Loan available<select name="loanAvailable" defaultValue={property.loanAvailable ?? ""}><option value="">Not specified</option><option value="yes">Yes</option><option value="no">No</option></select></label>
                <label>Registration available<select name="registrationAvailable" defaultValue={property.registrationAvailable ?? ""}><option value="">Not specified</option><option value="yes">Yes</option><option value="no">No</option></select></label>
                <label>Corner plot<select name="cornerPlot" defaultValue={property.cornerPlot ?? ""}><option value="">Not specified</option><option value="yes">Yes</option><option value="no">No</option></select></label>
                <label>Clear title<select name="clearTitle" defaultValue={property.clearTitle ?? ""}><option value="">Not specified</option><option value="yes">Yes</option><option value="no">No</option></select></label>
              </>}
            />
            <label>City or state<input name="city" required maxLength={80} defaultValue={property.city} /></label>
            <label>Neighbourhood or village<input name="locality" required maxLength={80} defaultValue={property.locality} /></label>
            <label>Land area<input name="area" required type="number" min="0.01" max="100000" step="any" defaultValue={property.area} /></label>
            <label>Area unit<input name="unit" required maxLength={20} defaultValue={property.unit} /></label>
            <label className="my-listing-wide">Price or rate (₹)<input name="price" required type="number" min="1" max="10000000000" defaultValue={property.price} /></label>
            <label className="my-listing-wide">Amenities<input name="amenities" maxLength={720} defaultValue={(property.amenities ?? []).join(", ")} placeholder="Separate amenities with commas" /></label>
            <label className="my-listing-wide">Property address<input name="address" maxLength={240} defaultValue={property.address ?? ""} /></label>
            <label className="my-listing-wide">Nearby landmark<input name="landmark" maxLength={120} defaultValue={property.landmark ?? ""} /></label>
            <label className="my-listing-wide">Google Maps location URL<input name="mapUrl" type="url" maxLength={500} defaultValue={property.mapUrl ?? ""} placeholder="https://maps.app.goo.gl/..." /></label>
            <label className="my-listing-wide">Contact phone<input name="phone" required type="tel" pattern="[+()0-9 -]{8,24}" defaultValue={property.phone} /></label>
            <label className="my-listing-wide">Description<textarea name="description" required minLength={10} maxLength={1500} rows={4} defaultValue={property.description} /></label>
            <label className="my-listing-wide">Replace listing photos<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple /></label>
            <p className="my-listing-wide photo-help">Leave photos empty to keep the current gallery. Choose as many JPEG, PNG, or WebP files as you need (up to 5 MB each) to replace it.</p>
            {photoProgress?.listingId === property.id && <p className="my-listing-wide photo-help" role="status">Uploading property photos… {photoProgress.uploaded}/{photoProgress.total}</p>}
              </div>
              <div className="my-listing-actions">
                <button className="button button-dark" type="submit" disabled={busyId === property.id}>{busyId === property.id ? "Saving…" : "Save changes"}</button>
                <span className="my-listing-save-note">Your update will appear on the public listing after it saves.</span>
              </div>
            </div>
          </details>
          <div className="my-listing-actions">
            <button className="admin-delete" type="button" disabled={busyId === property.id} onClick={() => void remove(property)}>Delete listing</button>
          </div>
        </form>
      )}</div> : <div className="empty-state"><h3>You haven&apos;t listed land yet.</h3><p>Create your first listing and manage its details and photos from here.</p><Link className="button button-dark" href="/sell">List your land for free <ArrowUpRight size={16} /></Link></div>}
  </section>;
}
