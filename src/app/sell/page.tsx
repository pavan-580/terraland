"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AmenitySelector } from "@/components/amenity-selector";
import { listingCategories, pricePeriodsByCategory, propertyTypes, rentalTypes, type ListingCategory } from "@/lib/market";
import { uploadPropertyPhotos } from "@/lib/upload-property-photos";

export default function SellPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoProgress, setPhotoProgress] = useState<{ uploaded: number; total: number } | null>(null);
  const [listingCategory, setListingCategory] = useState<ListingCategory>("sale");
  const [pricePeriod, setPricePeriod] = useState("total");
  const [propertyType, setPropertyType] = useState("");
  const [contactPhone, setContactPhone] = useState("+91 ");
  useEffect(() => {
    let active = true;
    void fetch("/api/auth", { cache: "no-store" }).then((response) => response.json()).then((result: { user?: { phone?: string } | null }) => {
      if (active && result.user?.phone) setContactPhone(result.user.phone);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const propertyOptions = listingCategory === "sale" ? propertyTypes : rentalTypes;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setPhotoProgress(null);
    try {
      const formData = new FormData(event.currentTarget);
      const photos = formData.getAll("photos").filter((file): file is File => file instanceof File && file.size > 0);
      const photoUrls = await uploadPropertyPhotos(photos, (uploaded, total) => setPhotoProgress({ uploaded, total }));
      formData.delete("photos");
      formData.set("photoUrls", JSON.stringify(photoUrls));
      setPhotoProgress(null);
      const response = await fetch("/api/properties", {
        method: "POST",
        body: formData,
      });
      const result = await response.json() as { id?: string; error?: string };
      if (response.status === 401) {
        router.push("/sign-in?next=%2Fsell");
        return;
      }
      if (!response.ok || !result.id) {
        setError(result.error ?? "Your listing could not be published. Please try again.");
        return;
      }
      router.push(`/properties/${result.id}`);
    } catch {
      setError("Your listing could not be published. Please check your connection and try again.");
    } finally {
      setBusy(false);
      setPhotoProgress(null);
    }
  }
  return <><SiteHeader /><main className="sell-page"><div className="sell-intro"><Link href="/" className="back-link"><ArrowLeft size={15} /> Back to home</Link><span className="eyebrow">A GOOD INTRODUCTION STARTS HERE</span><h1>{listingCategory === "sale" ? <>Let&apos;s find your land<br />its <em>next owner.</em></> : <>Make room for<br /><em>something special.</em></>}</h1><p>{listingCategory === "sale" ? "Share a few details about your property. Your listing will be visible to buyers across India." : "Showcase your farmhouse, private land, resort, or villa to people looking to rent it. Enquiries come through NILAY."}</p><div className="sell-points"><span><Check size={15} /> Free to list</span><span><Check size={15} /> You stay in control</span><span><Check size={15} /> Enquiries through NILAY</span></div><div className="sell-visual" /></div>
    <form className="sell-form" onSubmit={submit}><div className="form-heading"><span className="eyebrow">PROPERTY DETAILS</span><span>01 <i>/</i> 01</span></div><h2>{listingCategory === "sale" ? "Tell us about the place." : "List your place for rent."}</h2><p>{listingCategory === "sale" ? "Start with the essentials. You can share more with a buyer later." : "Set your rental rate, availability, and guest capacity. Interested visitors enquire through NILAY; no online payment is collected."}</p>
      <div className="listing-mode-field">
        <span className="listing-mode-label">Choose listing type</span>
        <input type="hidden" name="listingCategory" value={listingCategory} />
        <div className="listing-mode-switch" role="group" aria-label="Choose listing type">
          {listingCategories.map((item) => <button key={item.value} className={listingCategory === item.value ? "is-active" : ""}
            type="button" aria-pressed={listingCategory === item.value} onClick={() => {
              setListingCategory(item.value);
              setPricePeriod(pricePeriodsByCategory[item.value][0].value);
              setPropertyType(item.value === "sale" ? propertyTypes[0] : rentalTypes[0]);
            }}>{item.label}</button>)}
        </div>
      </div>
      <label>What would you call this listing?<input required name="title" minLength={4} maxLength={100} placeholder={listingCategory === "sale" ? "e.g. A sunny plot in Shankarpally" : "e.g. A farmhouse with a pool near Hyderabad"} /></label>
      <div className="form-row"><label>{listingCategory === "sale" ? "Land type" : "Place type"}<select required name="type" value={propertyType} onChange={(event) => setPropertyType(event.target.value)}><option value="" disabled>Select a type</option>{propertyOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label>City or state<input required name="city" maxLength={80} placeholder="e.g. Jaipur, Rajasthan" /></label></div>
      <label>Neighbourhood or village<input required name="locality" maxLength={80} placeholder={listingCategory === "sale" ? "Where can buyers find it?" : "Where can guests find it?"} /></label>
      <div className="form-row"><label>{listingCategory === "sale" ? "Land area" : "Property area"}<input required name="area" type="number" min="0.01" step="any" max="100000" placeholder="e.g. 200" /></label><label>Area unit<select name="unit" defaultValue="sq. yd."><option>sq. yd.</option><option>sq. ft.</option><option>acre</option><option>gunta</option></select></label></div>
      <div className="form-row"><label>{listingCategory === "sale" ? "Asking price (₹)" : "Rental rate (₹)"}<input required name="price" type="number" min={listingCategory === "sale" ? "10000" : "1"} max="10000000000" placeholder={listingCategory === "sale" ? "e.g. 4500000" : "Enter the rate"} /></label><label>Rate period<select required name="pricePeriod" value={pricePeriod} onChange={(event) => setPricePeriod(event.target.value)}>{pricePeriodsByCategory[listingCategory].map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
      {listingCategory === "rent" && <>
        <label>Availability and rental terms<input name="availability" maxLength={240} placeholder="e.g. Available year-round; 2-night minimum; advance booking required" /></label>
        <label>Guest capacity<input name="guestCapacity" type="number" min="1" max="1000" step="1" placeholder="Optional maximum number of guests" /></label>
      </>}
      {listingCategory === "sale" && <>
      <div className="listing-form-section"><span className="eyebrow">PROPERTY DETAILS</span><p>Help buyers understand the land. You can leave any detail blank if you are not sure.</p></div>
      <div className="form-row"><label>Facing<input name="facing" maxLength={40} placeholder="e.g. North-East" /></label><label>Road width<input name="roadWidth" maxLength={40} placeholder="e.g. 30 ft" /></label></div>
      <div className="form-row"><label>Approvals<input name="approvals" maxLength={120} placeholder="e.g. Gram Panchayat approved" /></label><label>Survey number<input name="surveyNumber" maxLength={80} placeholder="Survey / plot number" /></label></div>
      <div className="form-row"><label>Soil type<input name="soilType" maxLength={80} placeholder="e.g. Red soil" /></label><label>Renovation / condition<input name="renovation" maxLength={120} placeholder="e.g. Vacant, ready to build" /></label></div>
      <div className="form-row">
        <label>Loan available<select name="loanAvailable" defaultValue=""><option value="">Not specified</option><option value="yes">Yes</option><option value="no">No</option></select></label>
        <label>Registration available<select name="registrationAvailable" defaultValue=""><option value="">Not specified</option><option value="yes">Yes</option><option value="no">No</option></select></label>
      </div>
      <div className="form-row">
        <label>Corner plot<select name="cornerPlot" defaultValue=""><option value="">Not specified</option><option value="yes">Yes</option><option value="no">No</option></select></label>
        <label>Clear title<select name="clearTitle" defaultValue=""><option value="">Not specified</option><option value="yes">Yes</option><option value="no">No</option></select></label>
      </div>
      </>}
      <AmenitySelector key={listingCategory} />
      <div className="listing-form-section"><span className="eyebrow">ADDRESS & CONTACT</span><p>Give interested {listingCategory === "sale" ? "buyers" : "renters and guests"} enough information to find the area and reach you through NILAY.</p></div>
      <label>Property address<input name="address" maxLength={240} placeholder="Street, village, mandal, district" /></label>
      <label>Nearby landmark<input name="landmark" maxLength={120} placeholder="A nearby road, school, or landmark" /></label>
      <label>Google Maps location link<input name="mapUrl" type="url" maxLength={500} placeholder="https://maps.app.goo.gl/..." /></label>
      <p className="photo-help">Open the exact location in Google Maps, choose Share, and paste the link here. Buyers can open this precise pin.</p>
      <label>{listingCategory === "sale" ? "A few words about the land" : "Describe this place"}<textarea required name="description" minLength={10} maxLength={1500} placeholder={listingCategory === "sale" ? "What makes this place special? Mention access, approvals, or anything buyers should know." : "Describe the setting, facilities, access, and what makes this place special."} /></label>
      <label>Property photos<input required name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple /></label>
      <p className="photo-help">Upload as many JPEG, PNG, or WebP photos as you need. Each image must be 5 MB or smaller.</p>
      {photoProgress && <div className="photo-upload-progress" role="status"><span>Uploading property photos… {photoProgress.uploaded}/{photoProgress.total}</span><progress value={photoProgress.uploaded} max={photoProgress.total} /></div>}
      <label>Contact phone<input required name="phone" type="tel" inputMode="tel" pattern="[+()0-9 -]{8,24}" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="+91 98765 43210" /><small>Your account phone is filled in. Admins can see it in this listing&apos;s details.</small></label>
      {error && <div className="form-error">{error}</div>}
      <button type="submit" className="button button-dark sell-submit" disabled={busy}>{busy ? photoProgress ? "Uploading photos…" : "Publishing your listing…" : "Publish your listing"} <ArrowUpRight size={16} /></button>
      <p className="privacy-note">By publishing, you confirm you are authorized to share this property and contact details. The listing owner name is public; the contact phone is visible to anyone viewing a published listing while the administrator phone-display setting is on. Interested people can also send an enquiry through NILAY.</p>
    </form>
  </main><SiteFooter /></>;
}
