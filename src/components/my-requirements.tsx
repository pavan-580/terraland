"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ClipboardList, MapPin } from "lucide-react";

type Requirement = {
  id: string;
  preferredLocation: string;
  minBudget: number;
  maxBudget: number;
  minPlotSize: number;
  maxPlotSize: number;
  intendedUse: string;
  timeline: string;
  status: string;
  createdAt: string;
};

function range(min: number, max: number, suffix: string) {
  if (min && max) return `${min.toLocaleString("en-IN")}–${max.toLocaleString("en-IN")} ${suffix}`;
  if (min) return `From ${min.toLocaleString("en-IN")} ${suffix}`;
  if (max) return `Up to ${max.toLocaleString("en-IN")} ${suffix}`;
  return `Flexible ${suffix}`;
}

function budgetRange(min: number, max: number) {
  const amount = (value: number) => value >= 10000000
    ? `₹${(value / 10000000).toLocaleString("en-IN")} Cr`
    : `₹${(value / 100000).toLocaleString("en-IN")} L`;
  if (min && max) return `${amount(min)}–${amount(max)}`;
  if (min) return `From ${amount(min)}`;
  if (max) return `Up to ${amount(max)}`;
  return "Flexible";
}

export function MyRequirements() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/my-requirements")
      .then(async (response) => {
        const result = await response.json() as { requirements?: Requirement[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load your requirements.");
        if (active) setRequirements(result.requirements ?? []);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load your requirements.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <section className="my-requirements" id="my-requirements">
      <div className="profile-panel-heading">
        <div><span className="eyebrow">BUYER REQUIREMENTS</span><h2>My requirements</h2></div>
        <Link className="text-link" href="/requirements">Add a requirement <ArrowUpRight size={15} /></Link>
      </div>
      {loading ? <p className="my-requirements-message">Loading your requirements…</p> : error ? (
        <p className="my-requirements-message is-error" role="alert">{error}</p>
      ) : requirements.length ? (
        <div className="my-requirements-list">
          {requirements.map((item) => (
            <article className="my-requirement-card" key={item.id}>
              <div className="my-requirement-heading">
                <div><MapPin size={15} aria-hidden="true" /><strong>{item.preferredLocation}</strong></div>
                <span className={`my-requirement-status status-${item.status.toLowerCase()}`}>{item.status}</span>
              </div>
              <div className="my-requirement-details">
                <span>Budget <strong>{budgetRange(item.minBudget, item.maxBudget)}</strong></span>
                <span>Plot size <strong>{range(item.minPlotSize, item.maxPlotSize, "sq. yd.")}</strong></span>
                <span>Purpose <strong>{item.intendedUse.replaceAll("_", " ")}</strong></span>
                {item.timeline && <span>Timeline <strong>{item.timeline.replaceAll("_", " ")}</strong></span>}
              </div>
              <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString()}</time>
            </article>
          ))}
        </div>
      ) : (
        <div className="my-requirements-empty">
          <ClipboardList size={20} aria-hidden="true" />
          <div><strong>No requirements yet</strong><p>Share the area and budget you have in mind. We’ll keep your request here.</p></div>
          <Link className="button button-dark" href="/requirements">Tell us what you need <ArrowUpRight size={15} /></Link>
        </div>
      )}
    </section>
  );
}
