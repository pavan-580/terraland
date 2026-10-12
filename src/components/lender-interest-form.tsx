"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const dialingCountries = getCountries()
  .map((country) => ({ code: country, name: countryNames.of(country) ?? country, callingCode: getCountryCallingCode(country) }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function LenderInterestForm() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [country, setCountry] = useState<CountryCode>("IN");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setError("");
    setSending(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const localPhone = String(form.get("phone") ?? "").trim();
      const parsedPhone = parsePhoneNumberFromString(localPhone, country);
      if (!parsedPhone?.isValid()) throw new Error("Enter a valid mobile number for the selected country.");
      const response = await fetch("/api/lender-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: parsedPhone.number,
          amount: form.get("amount"),
          message: form.get("message"),
          consent: form.get("consent") === "on",
        }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!result || typeof result !== "object") throw new Error("We could not register your interest. Please try again.");
      const data = result as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "We could not register your interest. Please try again.");
      setSuccess(true);
      formElement.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not register your interest. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (success) return <div className="lender-interest-success" role="status">
    <span><Check size={20} /></span>
    <h2>Interest registered</h2>
    <p>Your details are saved for the NILAY team. We will contact you directly to discuss your interest.</p>
    <p>Your information is private and will not be published or sent to a borrower through this form.</p>
  </div>;

  return <form className="sell-form lender-interest-form" onSubmit={(event) => void submit(event)}>
    <span className="eyebrow">LENDER INTEREST</span>
    <h2>Register your interest</h2>
    <p>Tell us how much you may be able to lend. The NILAY team will contact you to discuss potential financing partnerships.</p>
    <label>Full name<input name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>
    <label>Email address<input name="email" required type="email" maxLength={254} autoComplete="email" /></label>
    <label>Mobile number
      <span className="lender-phone-input">
        <select name="country" aria-label="Country calling code" autoComplete="country" value={country} onChange={(event) => setCountry(event.target.value as CountryCode)}>
          {dialingCountries.map((item) => <option key={item.code} value={item.code}>{item.name} (+{item.callingCode})</option>)}
        </select>
        <input name="phone" required type="tel" inputMode="tel" autoComplete="tel-national" maxLength={24} placeholder={country === "IN" ? "98765 43210" : "Enter your local number"} />
      </span>
      <small>Choose your country code, then enter your mobile number.</small>
    </label>
    <label>Amount you may be able to lend (₹)<input name="amount" required type="number" min="1000" max="10000000000" step="1000" inputMode="numeric" placeholder="e.g. 500000" /><small>Enter an approximate amount in Indian rupees. This is not a commitment to lend.</small></label>
    <label>Additional details <span className="optional-label">optional</span><textarea name="message" maxLength={500} rows={3} placeholder="Share any relevant details for the NILAY team." /></label>
    <label className="lender-consent"><input name="consent" type="checkbox" required />I agree that NILAY may contact me about this expression of interest. I understand this is not a loan offer or loan application.</label>
    {error && <div className="form-error" role="alert">{error}</div>}
    <button className="button button-dark" type="submit" disabled={sending}>{sending ? "Submitting…" : "Register interest"} <ArrowUpRight size={16} /></button>
    <p className="privacy-note">Your name, email, phone number, and approximate amount are visible only to NILAY administrators. We will ask you before sharing your details with any prospective borrower.</p>
  </form>;
}
