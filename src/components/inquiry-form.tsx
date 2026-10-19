"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { formatListingPrice, type ListingCategory, type PricePeriod } from "@/lib/market";

type InquiryUser = { name: string; email: string; phone: string } | null;

type InquiryFormProps = {
  propertyId: string;
  title: string;
  type: string;
  listingCategory?: ListingCategory;
  pricePeriod?: PricePeriod;
  city: string;
  locality: string;
  price: number;
  area: number;
  unit: string;
  user: InquiryUser;
};

export function InquiryForm({ propertyId, title, type, listingCategory = "sale", pricePeriod, city, locality, price, area, unit, user }: InquiryFormProps) {
  const [message, setMessage] = useState("");
  const [contactName, setContactName] = useState(user?.name ?? "");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [contactPhone, setContactPhone] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [readyToBuy, setReadyToBuy] = useState(false);
  const [emiInterest, setEmiInterest] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ notificationPending: boolean; name: string } | null>(null);
  const [sending, setSending] = useState(false);
  const priceLabel = formatListingPrice({ price, listingCategory, pricePeriod });
  const enquiryHeading = listingCategory === "sale" ? "Ask us about this land." : "Enquire about this rental.";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    if (!/^\d{10}$/.test(contactPhone)) {
      setError("Enter a valid 10-digit mobile number after +91.");
      return;
    }
    if (listingCategory === "rent" && arrivalDate && departureDate && departureDate <= arrivalDate) {
      setError("Check-out must be after check-in.");
      return;
    }
    setError("");
    setSending(true);
    try {
      const rentalDetails = listingCategory === "rent" ? [
        arrivalDate ? `Check-in: ${arrivalDate}` : "",
        departureDate ? `Check-out: ${departureDate}` : "",
        guestCount ? `Guests: ${guestCount}` : "",
      ].filter(Boolean) : [];
      const purchaseIntent = listingCategory === "sale" ? [
        `Buyer ready to buy: ${readyToBuy ? "yes" : "no"}`,
        `Interested in monthly EMIs / bank loan options: ${emiInterest ? "yes" : "no"}`,
      ] : [];
      const enquiryMessage = [message.trim(), ...purchaseIntent, ...rentalDetails].filter(Boolean).join("\n");
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, message: enquiryMessage, name: contactName, email: contactEmail, phone: "+91" + contactPhone }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!result || typeof result !== "object") throw new Error("The enquiry could not be sent. Please try again.");
      const data = result as { error?: string; message?: string; notificationPending?: boolean };
      if (!response.ok) throw new Error(data.error ?? "The enquiry could not be sent. Please try again.");
      setSuccess({ notificationPending: data.notificationPending === true, name: contactName });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The enquiry could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return <div className="inquiry-form">
    <div><span className="eyebrow">{listingCategory === "sale" ? "INTERESTED IN THIS PLACE?" : "ENQUIRE THROUGH NILAY"}</span><h2>{enquiryHeading}</h2></div>
    {success ? <div className="inquiry-success" role="status">
      <span><Check size={20} /></span>
      <h3>Enquiry received</h3>
      <p>{success.notificationPending
      ? "Your enquiry is saved and its email notification is queued. Our team will follow up using the contact details you provided."
        : "Our team will reach you shortly using the contact details you provided."}</p>
      <dl className="inquiry-summary">
        <div><dt>Property</dt><dd>{title}</dd></div>
        <div><dt>Location</dt><dd>{locality}, {city}</dd></div>
        <div><dt>{listingCategory === "sale" ? "Land" : "Place"}</dt><dd>{type} · {area} {unit} · {priceLabel}</dd></div>
        <div><dt>Enquirer</dt><dd>{success.name}</dd></div>
      </dl>
    </div> : <>
      {user && <div className="inquiry-account"><span>SENDING AS</span><strong>{user.name}</strong></div>}
      <div className="inquiry-property-summary"><span>ABOUT THIS LISTING</span><strong>{title}</strong><small>{locality}, {city} · {area} {unit} · {priceLabel}</small></div>
      <form onSubmit={(event) => void submit(event)}>
        {!user && <label>Your name<input required minLength={2} maxLength={80} autoComplete="name" value={contactName} onChange={(event) => setContactName(event.target.value)} /></label>}
        {(!user || !user.email) && <label>Email address{!user && <span className="optional-label">required</span>}<input required={!user} type="email" autoComplete="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} /></label>}
        <label>Mobile number
          <div className="inquiry-phone-input"><span aria-hidden="true">+91</span><input required type="tel" inputMode="numeric" autoComplete="off" pattern="[0-9]{10}" maxLength={10} value={contactPhone} onChange={(event) => setContactPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" /></div>
          <small>Enter your 10-digit mobile number (+91 is added automatically).</small>
        </label>
        {listingCategory === "rent" && <div className="rental-request-fields">
          <div className="form-row">
            <label>Check-in date<input type="date" value={arrivalDate} onChange={(event) => setArrivalDate(event.target.value)} /></label>
            <label>Check-out date<input type="date" value={departureDate} onChange={(event) => setDepartureDate(event.target.value)} /></label>
          </div>
          <label>Number of guests<input type="number" min="1" max="1000" value={guestCount} onChange={(event) => setGuestCount(event.target.value)} placeholder="Optional" /></label>
        </div>}
        {listingCategory === "sale" && <fieldset className="inquiry-emi">
          <legend>Explore EMI options to own this land</legend>
          <p>Tell NILAY if you are ready to buy and want to explore monthly instalments.</p>
          <label className="inquiry-emi-option"><input type="checkbox" checked={readyToBuy} onChange={(event) => { setReadyToBuy(event.target.checked); if (event.target.checked) setEmiInterest(false); }} />I am ready to buy this property if the terms work for me.</label>
          <label className="inquiry-emi-option"><input type="checkbox" checked={emiInterest} onChange={(event) => { setEmiInterest(event.target.checked); if (event.target.checked) setReadyToBuy(false); }} />I want to explore monthly EMIs or bank loan options.</label>
          <small>We will contact you about possible options. Any loan, rate, and approval are subject to the lender.</small>
        </fieldset>}
        <label htmlFor={`inquiry-message-${propertyId}`}>Message <span className="optional-label">optional</span></label>
        <textarea id={`inquiry-message-${propertyId}`} name="message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={listingCategory === "rent" ? 850 : 900} placeholder="Ask a question or leave this blank to request more details." />
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button button-dark inquiry-submit" type="submit" disabled={sending}>{sending ? "Sending enquiry…" : listingCategory === "rent" ? "Send rental enquiry" : readyToBuy || emiInterest ? "Send buying interest" : "Send enquiry"} <ArrowUpRight size={16} /></button>
      </form>
      <p className="privacy-note">Your contact details, message, buying and EMI choices, and this listing&apos;s details are sent privately to the NILAY team so they can follow up with you.</p>
    </>}
  </div>;
}

