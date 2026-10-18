"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BackButton } from "@/components/back-button";

type Point = { period: string; visitors: number; pageViews: number };
type Payload = { daily: Point[]; monthly: Point[] };

function chartLabel(value: string, monthly: boolean) {
  const date = new Date(`${value}${monthly ? "-01" : ""}T12:00:00`);
  return date.toLocaleDateString("en-IN", monthly ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" });
}

export function AdminAnalytics() {
  const [data, setData] = useState<Payload>({ daily: [], monthly: [] });
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function load() {
    try {
      const response = await fetch("/api/admin/analytics", { cache: "no-store" });
      const result = await response.json() as Payload & { error?: string };
      if (!response.ok) throw new Error(result.error || "Analytics could not be loaded.");
      setData(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Analytics could not be loaded.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    fetch("/api/admin/analytics", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Analytics could not be loaded.");
        return res.json() as Promise<Payload>;
      })
      .then((result) => {
        if (active) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((reason) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Analytics could not be loaded.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  async function clear() {
    setBusy(true); setError(""); setMessage("");
    try { const response = await fetch("/api/admin/analytics", { method: "DELETE" }); const result = await response.json() as { message?: string; error?: string }; if (!response.ok) throw new Error(result.error || "Analytics could not be cleared."); setMessage(result.message || "Analytics cleared."); setConfirmClear(false); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Analytics could not be cleared."); }
    finally { setBusy(false); }
  }
  const points = data[period];
  const max = Math.max(1, ...points.map((point) => Number(point.visitors)));
  const total = points.reduce((sum, point) => sum + Number(point.visitors), 0);
  return <><section className="admin-intro"><span className="eyebrow">SITE CONTROL</span><h1>Visitor analytics</h1><p>Anonymous daily visitors and page views. Signed-in administrator visits are excluded.</p></section>
    <div className="analytics-toolbar"><BackButton fallbackHref="/admin" label="Back to dashboard" /><div className="analytics-actions"><button type="button" className={period === "daily" ? "is-active" : ""} onClick={() => setPeriod("daily")}>Daily</button><button type="button" className={period === "monthly" ? "is-active" : ""} onClick={() => setPeriod("monthly")}>Monthly</button><button type="button" className="admin-delete" onClick={() => { setConfirmClear(true); setMessage(""); }}>Clear analytics</button></div></div>
    {message && <p className="admin-success" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    {confirmClear && <div className="analytics-confirm" role="group" aria-label="Confirm clearing analytics"><span>This permanently deletes all recorded visitor analytics.</span><button className="admin-delete" type="button" disabled={busy} onClick={() => void clear()}>{busy ? "Clearing…" : "Confirm clear"}</button><button type="button" onClick={() => setConfirmClear(false)}>Cancel</button></div>}
    <section className="analytics-panel"><div className="analytics-summary"><div><span>{period === "daily" ? "VISITORS · LAST 30 DAYS" : "VISITORS · LAST 12 MONTHS"}</span><strong>{total.toLocaleString("en-IN")}</strong></div><div><span>PAGE VIEWS</span><strong>{points.reduce((sum, point) => sum + Number(point.pageViews), 0).toLocaleString("en-IN")}</strong></div></div>
      {loading ? <p>Loading analytics…</p> : points.length ? <div className="analytics-chart" role="img" aria-label={`${period} visitor graph`}>
        {points.map((point) => <div className="analytics-bar-column" key={point.period} title={`${chartLabel(point.period, period === "monthly")}: ${point.visitors} visitors, ${point.pageViews} page views`}><span>{Number(point.visitors).toLocaleString("en-IN")}</span><div className="analytics-bar" style={{ height: `${Math.max(3, Number(point.visitors) / max * 100)}%` }} /><small>{chartLabel(point.period, period === "monthly")}</small></div>)}
      </div> : <p className="admin-traffic-empty">No visits recorded yet. Visitors will appear after the tracker is deployed.</p>}</section>
  </>;
}
