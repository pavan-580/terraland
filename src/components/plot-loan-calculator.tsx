"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function PlotLoanCalculator() {
  const [amount, setAmount] = useState("2500000");
  const [rate, setRate] = useState("9");
  const [years, setYears] = useState("15");
  const result = useMemo(() => {
    const principal = Number(amount), annual = Number(rate), term = Number(years);
    if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(annual) || annual < 0 || annual > 50 || !Number.isFinite(term) || term <= 0 || term > 40) return null;
    const months = Math.round(term * 12), monthly = annual / 1200;
    const emi = monthly === 0 ? principal / months : principal * monthly * (1 + monthly) ** months / ((1 + monthly) ** months - 1);
    return { emi, total: emi * months, interest: emi * months - principal };
  }, [amount, rate, years]);
  return <section className="emi-calculator service-calculator">
    <div className="detail-card-heading"><span className="detail-card-icon"><Calculator size={17} /></span><div><span className="eyebrow">PLAN YOUR BUDGET</span><h2>Plot loan EMI estimate</h2></div></div>
    <div className="emi-fields">
      <label>Loan amount (₹)<input type="number" min="1" step="50000" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
      <label>Interest rate (% p.a.)<input type="number" min="0" max="50" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} /></label>
      <label>Loan term (years)<input type="number" min="1" max="40" step="1" value={years} onChange={(e) => setYears(e.target.value)} /></label>
    </div>
    {result ? <div className="emi-result" aria-live="polite"><span>ESTIMATED MONTHLY EMI</span><strong>{inr.format(result.emi)}</strong><div><span>Total interest</span><b>{inr.format(result.interest)}</b></div><div><span>Total repayment</span><b>{inr.format(result.total)}</b></div></div> : <p className="form-error" role="alert">Enter a positive loan amount, a rate from 0–50%, and a term up to 40 years.</p>}
    <p className="emi-disclaimer">Illustration only. Lenders set the actual rate, eligibility, fees, and loan term. Plot and agricultural land loans may have different eligibility rules.</p>
  </section>;
}
