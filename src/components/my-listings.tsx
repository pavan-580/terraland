"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Property } from "@/lib/market";
import { formatListingPrice } from "@/lib/market";
import { ListingClassificationFields } from "@/components/listing-classification-fields";
import { AmenitySelector } from "@/components/amenity-selector";
import { uploadPropertyPhotos, uploadPropertyVideos } from "@/lib/upload-property-photos";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function MyListings() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [photoProgress, setPhotoProgress] = useState<{ listingId: string; uploaded: number; total: number } | null>(null);
  const [videoProgress, setVideoProgress] = useState<{ listingId: string; uploaded: number; total: number } | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<Property | null>(null);
  const [removedMedia, setRemovedMedia] = useState<Record<string, { images: string[]; videos: string[] }>>({});

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
    setVideoProgress(null);
    try {
      const formData = new FormData(event.currentTarget);
      const removal = removedMedia[property.id] ?? { images: [], videos: [] };
      formData.set("removeImages", JSON.stringify(removal.images));
      formData.set("removeVideos", JSON.stringify(removal.videos));
      const media = formData.getAll("media").filter((file): file is File => file instanceof File && file.size > 0);
      const photos = media.filter((file) => file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name));
      if (photos.length) {
        const photoUrls = await uploadPropertyPhotos(photos, (uploaded, total) => setPhotoProgress({ listingId: property.id, uploaded, total }));
        formData.set("photoUrls", JSON.stringify(photoUrls));
      }
      const videos = media.filter((file) => file.type.startsWith("video/") || /\.(mp4|webm)$/i.test(file.name));
      if (videos.length) {
        const videoUrls = await uploadPropertyVideos(videos, (uploaded, total) => setVideoProgress({ listingId: property.id, uploaded, total }));
        formData.set("videoUrls", JSON.stringify(videoUrls));
      }
      formData.delete("media");
      const response = await fetch(`/api/properties/${encodeURIComponent(property.id)}`, {
        method: "PATCH",
        body: formData,
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Your listing could not be updated.");
      setMessage(result.message ?? "Your listing has been updated.");
      setRemovedMedia((current) => { const next = { ...current }; delete next[property.id]; return next; });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your listing could not be updated.");
    } finally {
      setBusyId("");
      setPhotoProgress(null);
      setVideoProgress(null);
    }
  }

  async function remove(property: Property) {
    setError("");
    setPendingRemoval(property);
  }

  async function confirmRemoval() {
    if (!pendingRemoval) return;
    const property = pendingRemoval;
    setBusyId(property.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(property.id)}`, { method: "DELETE" });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Your listing could not be deleted.");
      setMessage(result.message ?? "Your deletion request is awaiting administrator approval.");
      setPendingRemoval(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your listing could not be deleted.");
    } finally {
      setBusyId("");
    }
  }

  return <section className="my-listings">
    {pendingRemoval && <ConfirmDialog title="Request listing deletion?" description={`Send a deletion request for “${pendingRemoval.title}”? It will remain online until an administrator approves it.`} confirmLabel="Send deletion request" error={error} busy={busyId === pendingRemoval.id} onCancel={() => setPendingRemoval(null)} onConfirm={() => void confirmRemoval()} />}
    {error && !pendingRemoval && <div className="form-error" role="alert">{error}</div>}
    {message && <div className="admin-success" role="status">{message}</div>}
    {loading ? <div className="loading-state">Loading your listings…</div> :
      properties.length ? <div className="my-listings-grid">{properties.map((property) =>
        <form className="my-listing-card" key={property.id} onSubmit={(event) => void save(event, property)}>
          <div className="my-listing-top">
            <div className="my-listing-image" style={{ backgroundImage: `url("${property.images?.[0] ?? property.image}")` }} />
            <div className="my-listing-title">
              <span className="eyebrow">{property.deleteRequestedAt ? "DELETION REQUESTED · AWAITING APPROVAL" : property.status === "pending" ? "PENDING ADMIN REVIEW" : property.status === "hidden" ? "HIDDEN" : "PUBLISHED"} · {property.listingCategory === "rent" ? "FOR RENT" : "FOR SALE"} · {property.locality}, {property.city}</span>
              <strong translate="no">{property.title}</strong>
              <span className="my-listing-price">{formatListingPrice(property)} · {property.area} {property.unit}</span>
              {property.status === "published" ? <Link href={`/properties/${encodeURIComponent(property.id)}`}>View listing <ArrowUpRight size={14} /></Link> : <small>{property.status === "pending" ? "This listing stays private until NILAY approves it." : "This listing is not currently visible on the website."}</small>}
            </div>
          </div>
          <details className="my-listing-editor">
            <summary><span>Edit listing details, photos, and videos</span><small>Changes are saved only when you select Save changes.</small></summary>
            <div className="my-listing-editor-content">
              <p className="my-listing-instructions">Update the information customers see. Your current photos and videos stay in place unless you choose replacements below.</p>
              <div className="my-listing-current-photos" aria-label={`${property.images?.length ?? 1} current listing photos`}>
                {(property.images?.length ? property.images : [property.image]).filter((image) => !(removedMedia[property.id]?.images ?? []).includes(image)).map((image, index) => <div className="my-listing-media-item" key={`${image}-${index}`}><div role="img" aria-label={`Current listing photo ${index + 1}`} style={{ backgroundImage: `url("${image}")` }} /><button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => setRemovedMedia((current) => ({ ...current, [property.id]: { images: [...(current[property.id]?.images ?? []), image], videos: current[property.id]?.videos ?? [] } }))}>Remove</button></div>)}
              </div>
              {property.videos?.length ? <div className="my-listing-current-photos" aria-label={`${property.videos.length} current listing videos`}>
                {property.videos.filter((video) => !(removedMedia[property.id]?.videos ?? []).includes(video)).map((video, index) => <div className="my-listing-media-item" key={`${video}-${index}`}><video src={video} controls muted playsInline preload="metadata" aria-label={`Current listing video ${index + 1}`} /><button type="button" aria-label={`Remove video ${index + 1}`} onClick={() => setRemovedMedia((current) => ({ ...current, [property.id]: { images: current[property.id]?.images ?? [], videos: [...(current[property.id]?.videos ?? []), video] } }))}>Remove</button></div>)}
              </div> : null}
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
            <label>Land area<input name="area" required type="text" inputMode="decimal" maxLength={80} defaultValue={property.area} placeholder="e.g. 58,741 or 1.25" /></label>
            <label>Area unit<input name="unit" required maxLength={20} defaultValue={property.unit} /></label>
            <label className="my-listing-wide">Price or rate (₹)<input name="price" required type="number" min="1" step="1" defaultValue={property.price} /></label>
            <AmenitySelector key={`${property.id}-${(property.amenities ?? []).join("|")}`} selected={property.amenities ?? []} className="my-listing-wide" />
            <label className="my-listing-wide">Property address<input name="address" maxLength={240} defaultValue={property.address ?? ""} /></label>
            <label className="my-listing-wide">Nearby landmark<input name="landmark" maxLength={120} defaultValue={property.landmark ?? ""} /></label>
            <label className="my-listing-wide">Google Maps location URL<input name="mapUrl" type="url" maxLength={500} defaultValue={property.mapUrl ?? ""} placeholder="https://maps.app.goo.gl/..." /></label>
            <label className="my-listing-wide">
              Contact phone
              <div className="phone-input-wrap" style={{ marginTop: "6px" }}>
                <span className="phone-input-prefix">+91</span>
                <input
                  name="phone"
                  required
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  defaultValue={property.phone ? property.phone.replace(/^\+91/, "").replace(/\D/g, "") : ""}
                  placeholder="9876543210"
                />
              </div>
            </label>
            <label className="my-listing-wide">Description<textarea name="description" required minLength={10} maxLength={1500} rows={4} defaultValue={property.description} /></label>
            <label className="my-listing-wide">Replace listing photos and videos<input name="media" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.webm" multiple /></label>
            <p className="my-listing-wide photo-help">Choose photos and videos together. Selected photos replace current photos; selected videos replace current videos. Leave either type unselected to keep it. Up to 5 MB per photo and 100 MB per video.</p>
            {photoProgress?.listingId === property.id && <p className="my-listing-wide photo-help" role="status">Uploading property photos… {photoProgress.uploaded}/{photoProgress.total}</p>}
            {videoProgress?.listingId === property.id && <p className="my-listing-wide photo-help" role="status">Uploading property videos… {videoProgress.uploaded}/{videoProgress.total}</p>}
              </div>
              <div className="my-listing-actions">
                <button className="button button-dark" type="submit" disabled={busyId === property.id}>{busyId === property.id ? "Saving…" : "Save changes"}</button>
                <span className="my-listing-save-note">Your update will appear on the public listing after it saves.</span>
              </div>
            </div>
          </details>
          <div className="my-listing-actions">
            <button className="admin-delete" type="button" disabled={busyId === property.id || Boolean(property.deleteRequestedAt)} onClick={() => void remove(property)}>{property.deleteRequestedAt ? "Deletion awaiting approval" : "Request listing deletion"}</button>
          </div>
        </form>
      )}</div> : <div className="empty-state"><h3>You haven&apos;t listed land yet.</h3><p>Create your first listing and manage its details and photos from here.</p><Link className="button button-dark" href="/sell">List your land for free <ArrowUpRight size={16} /></Link></div>}
  </section>;
}
