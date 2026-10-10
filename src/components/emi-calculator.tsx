"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function EmiCalculator({ propertyPrice }: { propertyPrice: number }) {
  const [principal, setPrincipal] = useState(String(Math.round(propertyPrice * 0.8)));
  const [annualRate, setAnnualRate] = useState("8.5");
  const [years, setYears] = useState("20");
  const result = useMemo(() => {
    if (!principal.trim() || !annualRate.trim() || !years.trim()) return null;
    const amount = Number(principal);
    const rate = Number(annualRate);
    const duration = Number(years);
    if (!Number.isFinite(amount) || amount <= 0 || amount > propertyPrice ||
      !Number.isFinite(rate) || rate < 0 || rate > 50 ||
      !Number.isFinite(duration) || duration <= 0 || duration > 40) return null;
    const months = Math.round(duration * 12);
    const monthlyRate = rate / 1200;
    const emi = monthlyRate === 0
      ? amount / months
      : amount * monthlyRate * ((1 + monthlyRate) ** months) / (((1 + monthlyRate) ** months) - 1);
    return { emi, total: emi * months, interest: (emi * months) - amount };
  }, [principal, annualRate, years, propertyPrice]);

  return <section className="emi-calculator">
    <div className="detail-card-heading"><span className="detail-card-icon"><Calculator size={17} /></span><div><span className="eyebrow">PLAN YOUR BUDGET</span><h2>Land loan EMI estimate</h2></div></div>
    <div className="emi-fields">
      <label>Loan amount (₹)<input type="number" min="1" max={propertyPrice} step="10000" value={principal} onChange={(event) => setPrincipal(event.target.value)} /></label>
      <label>Interest rate (% p.a.)<input type="number" min="0" max="50" step="0.1" value={annualRate} onChange={(event) => setAnnualRate(event.target.value)} /></label>
      <label>Loan term (years)<input type="number" min="1" max="40" step="1" value={years} onChange={(event) => setYears(event.target.value)} /></label>
    </div>
    {result ? <div className="emi-result" aria-live="polite">
      <span>ESTIMATED MONTHLY EMI</span><strong>{currency.format(result.emi)}</strong>
      <div><span>Total interest</span><b>{currency.format(result.interest)}</b></div>
      <div><span>Total repayment</span><b>{currency.format(result.total)}</b></div>
    </div> : <p className="form-error" role="alert">Enter a valid loan amount, interest rate, and loan term.</p>}
    <p className="emi-disclaimer">Illustration only. Actual rates, eligibility, fees, and terms are set by the lender. Land loans may have different eligibility rules.</p>
  </section>;
}
