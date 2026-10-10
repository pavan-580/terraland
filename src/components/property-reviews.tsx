"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Star } from "lucide-react";

type Review = {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string | null;
};

type ReviewsResponse = {
  reviews: Review[];
  ownReview: Review | null;
  user: { name: string } | null;
};

export function PropertyReviews({ propertyId }: { propertyId: string }) {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadReviews = useCallback(async () => {
    const response = await fetch(`/api/reviews?propertyId=${encodeURIComponent(propertyId)}`);
    const result = await response.json() as ReviewsResponse & { error?: string };
    if (!response.ok) throw new Error(result.error ?? "Reviews could not be loaded.");
    setData(result);
    if (result.ownReview) {
      setRating(result.ownReview.rating);
      setComment(result.ownReview.comment);
    }
  }, [propertyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReviews().catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Reviews could not be loaded.");
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadReviews]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, rating, comment }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Your review could not be saved.");
      setMessage(result.message ?? "Your review has been saved.");
      await loadReviews();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your review could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  const average = data?.reviews.length
    ? data.reviews.reduce((sum, review) => sum + review.rating, 0) / data.reviews.length
    : 0;
  const signInUrl = `/sign-in?next=${encodeURIComponent(`/properties/${propertyId}`)}`;

  return <section className="property-reviews" aria-labelledby="reviews-heading">
    <div className="reviews-heading">
      <div><span className="eyebrow">COMMUNITY FEEDBACK</span><h2 id="reviews-heading">Reviews</h2></div>
      {data && <div className="reviews-summary"><Star size={17} fill="currentColor" /><strong>{data.reviews.length ? average.toFixed(1) : "—"}</strong><span>{data.reviews.length} {data.reviews.length === 1 ? "review" : "reviews"}</span></div>}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {message && <p className="admin-success" role="status">{message}</p>}
    {data?.user ? <form className="review-form" onSubmit={submit}>
      <h3>{data.ownReview ? "Update your review" : `Share your experience${data.user.name ? `, ${data.user.name}` : ""}`}</h3>
      <fieldset className="review-rating">
        <legend>Your rating</legend>
        {[1, 2, 3, 4, 5].map((value) => <button
          key={value}
          type="button"
          className={value <= rating ? "is-selected" : ""}
          aria-label={`${value} star${value === 1 ? "" : "s"}`}
          aria-pressed={rating === value}
          onClick={() => setRating(value)}
        ><Star size={22} fill="currentColor" /></button>)}
      </fieldset>
      <label>Your review<textarea required minLength={5} maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What should other land buyers know?" /></label>
      <button className="button button-dark" disabled={busy}>{busy ? "Saving…" : data.ownReview ? "Update review" : "Post review"}</button>
    </form> : <div className="review-sign-in"><p>Sign in to share a review of this listing.</p><Link className="button button-outline" href={signInUrl}>Sign in to review</Link></div>}
    <div className="review-list">
      {data?.reviews.length ? data.reviews.map((review) => <article className="review-card" key={review.id}>
        <div className="review-card-top"><strong>{review.reviewerName}</strong><time dateTime={review.updatedAt ?? review.createdAt}>{new Date(review.updatedAt ?? review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}{review.updatedAt ? " · edited" : ""}</time></div>
        <div className="review-stars" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} fill={index < review.rating ? "currentColor" : "none"} />)}</div>
        <p>{review.comment}</p>
      </article>) : data && <p className="reviews-empty">No reviews yet. Be the first to share useful feedback.</p>}
    </div>
  </section>;
}
