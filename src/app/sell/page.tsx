"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Check, ShieldCheck, ChevronDown } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AmenitySelector } from "@/components/amenity-selector";
import { NilayLoader } from "@/components/nilay-loader";
import { listingCategories, pricePeriodsByCategory, propertyTypes, rentalTypes, type ListingCategory } from "@/lib/market";
import { uploadPropertyPhotos, uploadPropertyVideos } from "@/lib/upload-property-photos";

function normalizeIndianMobile(value: string) {
  const digits = value.replace(/\D/g, "");
  const localNumber = digits.startsWith("91") && digits.length > 10 ? digits.slice(2) : digits;
  return localNumber.slice(0, 10);
}

export default function SellPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [photoProgress, setPhotoProgress] = useState<{ uploaded: number; total: number } | null>(null);
  const [videoProgress, setVideoProgress] = useState<{ uploaded: number; total: number } | null>(null);
  const [listingCategory, setListingCategory] = useState<ListingCategory>("sale");
  const [pricePeriod, setPricePeriod] = useState("total");
  const [propertyType, setPropertyType] = useState("Residential Plot");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/auth", { cache: "no-store" }).then((response) => response.json()).then((result: { user?: { phone?: string } | null }) => {
      if (!active) return;
      if (!result.user) {
        router.replace("/sign-in?next=%2Fsell");
        return;
      }
      if (result.user.phone) setContactPhone(normalizeIndianMobile(result.user.phone));
      setCheckingAccess(false);
    }).catch(() => {
      if (active) router.replace("/sign-in?next=%2Fsell");
    });
    return () => { active = false; };
  }, [router]);

  const propertyOptions = listingCategory === "sale" ? propertyTypes : rentalTypes;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setPhotoProgress(null);
    setVideoProgress(null);
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("phone", `+91${normalizeIndianMobile(String(formData.get("phone") ?? ""))}`);
      const media = formData.getAll("media").filter((file): file is File => file instanceof File && file.size > 0);
      const photos = media.filter((file) => file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name));
      const videos = media.filter((file) => file.type.startsWith("video/") || /\.(mp4|webm)$/i.test(file.name));
      const photoUrls = await uploadPropertyPhotos(photos, (uploaded, total) => setPhotoProgress({ uploaded, total }));
      formData.delete("media");
      formData.set("photoUrls", JSON.stringify(photoUrls));
      const videoUrls = await uploadPropertyVideos(videos, (uploaded, total) => setVideoProgress({ uploaded, total }));
      formData.set("videoUrls", JSON.stringify(videoUrls));
      setPhotoProgress(null);
      setVideoProgress(null);
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
      setSubmitted(true);
    } catch {
      setError("Your listing could not be published. Please check your connection and try again.");
    } finally {
      setBusy(false);
      setPhotoProgress(null);
      setVideoProgress(null);
    }
  }

  if (checkingAccess) {
    return (
      <>
        <SiteHeader />
        <main className="sell-page" style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <NilayLoader fullscreen />
        </main>
        <SiteFooter />
      </>
    );
  }

  if (submitted) return (
    <>
      <SiteHeader />
      <main className="sell-page">
        <section className="sell-form seller-submission-success" role="status">
          <span className="eyebrow">SUBMITTED FOR VERIFICATION</span>
          <h2>Your plot is under review by NILAY.</h2>
          <p>To ensure high buyer trust, our founder will contact you to verify ownership and document details before making the listing public. You can check its status anytime under My listings.</p>
          <Link className="button button-dark" href="/my-listings">View my listings <ArrowUpRight size={16} /></Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );

  return (
    <>
      <SiteHeader />
      <main className="sell-page">
        <div className="sell-intro">
          <BackButton className="back-link" fallbackHref="/" label="Back to home" />
          <span className="eyebrow">DIRECT SELLER ACQUISITION</span>
          <h1>
            {listingCategory === "sale" ? (
              <>List your residential plot<br />in <em>Miyapur & Hyderabad.</em></>
            ) : (
              <>Showcase your property<br /><em>for lease or rent.</em></>
            )}
          </h1>
          <p>
            {listingCategory === "sale"
              ? "Connect directly with verified buyers in the Miyapur corridor. Every listing is manually reviewed and checked to prevent unverified middlemen."
              : "List your property with transparent terms. Enquiries are routed through NILAY."}
          </p>
          <div className="sell-points">
            <span><Check size={15} /> Free listing at launch</span>
            <span><Check size={15} /> Founder-reviewed & verified</span>
            <span><Check size={15} /> Zero fabricated enquiries</span>
            <span><ShieldCheck size={15} /> Transparent document disclosures</span>
          </div>
          <div className="sell-visual" />
        </div>

        <form className="sell-form" onSubmit={submit}>
          <div className="form-heading">
            <span className="eyebrow">PROPERTY DETAILS</span>
            <span>01 <i>/</i> 01</span>
          </div>
          <h2>{listingCategory === "sale" ? "Tell us about the plot." : "List your place for rent."}</h2>
          <p>
            {listingCategory === "sale"
              ? "Accurate details build buyer confidence. Enter actual plot dimensions and document status."
              : "Set your rental rate, availability, and guest capacity. Enquiries route through NILAY."}
          </p>

          <div className="listing-mode-field">
            <span className="listing-mode-label">Choose listing type</span>
            <input type="hidden" name="listingCategory" value={listingCategory} />
            <div className="listing-mode-switch" role="group" aria-label="Choose listing type">
              {listingCategories.map((item) => (
                <button
                  key={item.value}
                  className={listingCategory === item.value ? "is-active" : ""}
                  type="button"
                  aria-pressed={listingCategory === item.value}
                  onClick={() => {
                    setListingCategory(item.value);
                    setPricePeriod(pricePeriodsByCategory[item.value][0].value);
                    setPropertyType(item.value === "sale" ? "Residential Plot" : rentalTypes[0]);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <label>
            Listing Title
            <input
              required
              name="title"
              minLength={4}
              maxLength={100}
              placeholder={listingCategory === "sale" ? "e.g. 200 Sq. Yd East Facing Residential Plot near Miyapur Metro" : "e.g. Farmhouse near Hyderabad"}
            />
          </label>

          <div className="form-row">
            <label>
              Property Type
              <div className="custom-select-wrap">
                <select
                  required
                  name="type"
                  value={propertyType}
                  onChange={(event) => setPropertyType(event.target.value)}
                >
                  <option value="" disabled>Select a type</option>
                  {propertyOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <ChevronDown size={14} className="select-chevron" />
              </div>
            </label>
            <label>
              City & State
              <input
                required
                name="city"
                maxLength={80}
                defaultValue="Hyderabad, Telangana"
                placeholder="e.g. Hyderabad, Telangana"
              />
            </label>
          </div>

          <label>
            Locality / Colony
            <input
              required
              name="locality"
              maxLength={80}
              placeholder="e.g. Miyapur, Bachupally, Ameenpur, Madinaguda, Chandanagar"
            />
          </label>

          <div className="form-row">
            <label>
              {listingCategory === "sale" ? "Plot Area" : "Property Area"}
              <input
                required
                name="area"
                type="text"
                inputMode="decimal"
                maxLength={80}
                placeholder="e.g. 150, 200, 300, 500"
              />
            </label>
            <label>
              Area Unit
              <div className="custom-select-wrap">
                <select name="unit" defaultValue="sq. yd.">
                  <option value="sq. yd.">sq. yd. (Square Yards)</option>
                  <option value="sq. ft.">sq. ft.</option>
                  <option value="gunta">gunta (121 sq. yd.)</option>
                  <option value="acre">acre (4840 sq. yd.)</option>
                </select>
                <ChevronDown size={14} className="select-chevron" />
              </div>
            </label>
          </div>

          <div className="form-row">
            <label>
              {listingCategory === "sale" ? "Total Asking Price (₹)" : "Rental rate (₹)"}
              <input
                required
                name="price"
                type="number"
                min="1"
                step="1"
                placeholder={listingCategory === "sale" ? "e.g. 6500000 (65 Lakhs)" : "Enter your rental rate"}
              />
            </label>
            {listingCategory === "sale" ? (
              <label>
                Price Negotiability
                <div className="custom-select-wrap">
                  <select name="isNegotiable" defaultValue="negotiable">
                    <option value="negotiable">Negotiable</option>
                    <option value="slightly_negotiable">Slightly Negotiable</option>
                    <option value="fixed">Fixed Price</option>
                  </select>
                  <ChevronDown size={14} className="select-chevron" />
                </div>
              </label>
            ) : (
              <label>
                Rate period
                <div className="custom-select-wrap">
                  <select
                    required
                    name="pricePeriod"
                    value={pricePeriod}
                    onChange={(event) => setPricePeriod(event.target.value)}
                  >
                    {pricePeriodsByCategory[listingCategory].map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="select-chevron" />
                </div>
              </label>
            )}
          </div>

          {listingCategory === "rent" && (
            <>
              <label>Availability and rental terms<input name="availability" maxLength={240} placeholder="e.g. Available year-round; 2-night minimum" /></label>
              <label>Guest capacity<input name="guestCapacity" type="number" min="1" max="1000" step="1" placeholder="Optional maximum number of guests" /></label>
            </>
          )}

          {listingCategory === "sale" && (
            <>
              <div className="listing-form-section">
                <span className="eyebrow">PLOT SPECIFICS & LAYOUT</span>
                <p>These details help serious buyers evaluate your plot immediately.</p>
              </div>

              <div className="form-row">
                <label>
                  Plot Facing
                  <input name="facing" maxLength={40} placeholder="e.g. East, North, North-East, West" />
                </label>
                <label>
                  Approaching Road Width
                  <input name="roadWidth" maxLength={40} placeholder="e.g. 30 ft CC road, 40 ft BT road" />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Layout Approvals
                  <input name="approvals" maxLength={120} placeholder="e.g. HMDA Approved, GHMC Approved, Gram Panchayat" />
                </label>
                <label>
                  Survey / Plot Number
                  <input name="surveyNumber" maxLength={80} placeholder="Plot # / Survey # (shared only with verified buyers)" />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Document Readiness
                  <div className="custom-select-wrap">
                    <select name="documentStatus" defaultValue="seller_declared">
                      <option value="seller_declared">Seller Declared (Documents will be shown during visit)</option>
                      <option value="docs_collected">Registered Link Documents & Pattadar Passbook Ready</option>
                    </select>
                    <ChevronDown size={14} className="select-chevron" />
                  </div>
                </label>
                <label>
                  Corner Plot?
                  <div className="custom-select-wrap">
                    <select name="cornerPlot" defaultValue="">
                      <option value="">Not specified</option>
                      <option value="yes">Yes (Two-side road)</option>
                      <option value="no">No (Single road facing)</option>
                    </select>
                    <ChevronDown size={14} className="select-chevron" />
                  </div>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Bank Loan Facility
                  <div className="custom-select-wrap">
                    <select name="loanAvailable" defaultValue="">
                      <option value="">Not specified</option>
                      <option value="yes">Eligible for Bank Loan</option>
                      <option value="no">Not eligible / Direct payment</option>
                    </select>
                    <ChevronDown size={14} className="select-chevron" />
                  </div>
                </label>
                <label>
                  Immediate Registration
                  <div className="custom-select-wrap">
                    <select name="registrationAvailable" defaultValue="yes">
                      <option value="yes">Ready for Immediate Sub-Registrar Registration</option>
                      <option value="no">Requires time / Agreement first</option>
                    </select>
                    <ChevronDown size={14} className="select-chevron" />
                  </div>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Clear Title Confirmation
                  <div className="custom-select-wrap">
                    <select name="clearTitle" defaultValue="yes">
                      <option value="yes">Yes - Freehold, Single Owner Title</option>
                      <option value="no">Joint Property / In Process</option>
                    </select>
                    <ChevronDown size={14} className="select-chevron" />
                  </div>
                </label>
                <label>
                  Soil & Boundary Status
                  <input name="soilType" maxLength={80} placeholder="e.g. Red soil, Boundary stone demarcated" />
                </label>
              </div>
            </>
          )}

          <AmenitySelector key={listingCategory} />

          <div className="listing-form-section">
            <span className="eyebrow">LOCATION & PINPOINT</span>
            <p>Give buyers accurate spatial information to arrange site visits.</p>
          </div>

          <label>
            Property Address / Landmark
            <input name="address" maxLength={240} placeholder="Colony name, Phase, near Landmark or Metro Station" />
          </label>
          <label>
            Google Maps Location Link
            <input name="mapUrl" type="url" maxLength={500} placeholder="https://maps.app.goo.gl/..." />
          </label>
          <p className="photo-help">Drop a pin on Google Maps at the plot location, tap Share &gt; Copy Link, and paste it here.</p>

          <label>
            Description of the Plot
            <textarea
              required
              name="description"
              minLength={10}
              maxLength={1500}
              placeholder="Highlight dimensions (e.g. 33x55), surrounding developments, proximity to Miyapur Metro or Mumbai Highway, ground water availability, and suitability for immediate construction."
            />
          </label>

          <label>
            Property Photos
            <input
              required
              name="media"
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.webm"
              multiple
            />
          </label>
          <p className="photo-help">Add clear photographs showing plot boundaries, access road, and surrounding houses. Add at least 1 actual photo.</p>

          {photoProgress && (
            <div className="photo-upload-progress" role="status">
              <span>Uploading property photos… {photoProgress.uploaded}/{photoProgress.total}</span>
              <progress value={photoProgress.uploaded} max={photoProgress.total} />
            </div>
          )}

          {videoProgress && (
            <div className="photo-upload-progress" role="status">
              <span>Uploading property videos… {videoProgress.uploaded}/{videoProgress.total}</span>
              <progress value={videoProgress.uploaded} max={videoProgress.total} />
            </div>
          )}

          <div className="listing-form-section">
            <span className="eyebrow">SELLER AUTHORITY & CONSENT</span>
            <p>To keep NILAY trustworthy, all listings require owner confirmation and explicit publication consent.</p>
          </div>

          <label>
            Contact Phone
            <div className="phone-input-wrap" style={{ marginTop: "6px" }}>
              <span className="phone-input-prefix">+91</span>
              <input
                required
                name="phone"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={15}
                value={contactPhone}
                onChange={(event) => {
                  setContactPhone(normalizeIndianMobile(event.target.value));
                }}
                placeholder="9876543210"
              />
            </div>
            <small>Enter your 10-digit mobile number (+91 is added automatically). The NILAY team will contact you to verify details before listing.</small>
          </label>

          <label>
            Are you the property owner or an authorised representative?
            <div className="custom-select-wrap">
              <select required name="sellerAuthority" defaultValue="owner">
                <option value="owner">Direct Property Owner</option>
                <option value="authorized_representative">Authorised Representative / Family Member</option>
              </select>
              <ChevronDown size={14} className="select-chevron" />
            </div>
          </label>

          <label className="seller-consent">
            <input required type="checkbox" name="publicationConsent" />
            I confirm I am authorised to submit this property and permit NILAY to publish this listing after founder verification.
          </label>

          <label className="seller-consent">
            <input required type="checkbox" name="contactConsent" />
            I give NILAY permission to contact me regarding buyer enquiries and site visit appointments.
          </label>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="button button-dark sell-submit" disabled={busy}>
            {busy
              ? photoProgress
                ? "Uploading photos…"
                : videoProgress
                ? "Uploading videos…"
                : "Submitting for review…"
              : "Submit plot for verification"}{" "}
            <ArrowUpRight size={16} />
          </button>
          <p className="privacy-note">Your property will not appear on the live site until verified by the founder. No fake listings are allowed on NILAY.</p>
        </form>
      </main>
      <SiteFooter />
    </>
  );
}
