"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured, createDataClient } from "@/lib/supabase/data";
import Icon from "@/components/Icon";

function Stars({ value }) {
  return (
    <span className="review-list-stars" aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width="13" height="13" viewBox="0 0 24 24" fill={n <= value ? "var(--accent-green)" : "var(--border-color)"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

export default function ReviewList({ bisneId }) {
  const [reviews, setReviews] = useState(undefined); // undefined cargando

  useEffect(() => {
    if (!bisneId || !isSupabaseConfigured()) return;
    let active = true;
    createDataClient()
      .from("reviews")
      .select("rating, comment, created_at, profiles(display_name)")
      .eq("bisne_id", bisneId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (active) setReviews(data || []);
      });
    return () => {
      active = false;
    };
  }, [bisneId]);

  if (reviews === undefined) return null;
  if (reviews.length === 0) return null;

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <section className="review-list-section" aria-label="Reseñas de la tienda">
      <h2 className="featured-title">
        Reseñas
        <span className="featured-title-line" />
        <span className="review-list-avg">
          <Icon name="star" size={13} /> {avg.toFixed(1)} ({reviews.length})
        </span>
      </h2>

      <div className="review-list">
        {reviews.map((r) => (
          <article key={r.created_at + r.comment} className="review-item">
            <div className="review-item-head">
              <strong className="review-item-author">{r.profiles?.display_name || "Comprador"}</strong>
              <Stars value={r.rating} />
            </div>
            {r.comment && <p className="review-item-comment">{r.comment}</p>}
            <time className="review-item-date">
              {new Date(r.created_at).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}
            </time>
          </article>
        ))}
      </div>
    </section>
  );
}
