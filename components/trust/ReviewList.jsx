"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured, createDataClient } from "@/lib/supabase/data";
import Icon from "@/components/Icon";

const PAGE_SIZE = 5;

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

export default function ReviewList({ bisneId, refreshKey = 0, onLeaveReview }) {
  const [reviews, setReviews] = useState(undefined); // undefined cargando
  const [ratings, setRatings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!bisneId || !isSupabaseConfigured()) return;
    let active = true;
    const supabase = createDataClient();
    (async () => {
      const [{ data: ratings }, { data, count }] = await Promise.all([
        supabase.from("reviews").select("rating").eq("bisne_id", bisneId),
        supabase
          .from("reviews")
          .select("rating, comment, created_at, profiles(display_name)", { count: "exact" })
          .eq("bisne_id", bisneId)
          .order("created_at", { ascending: false })
          .range(0, PAGE_SIZE - 1),
      ]);
      if (!active) return;
      setRatings((ratings || []).map((r) => r.rating));
      setTotal(count ?? (ratings || []).length);
      setReviews(data || []);
    })();
    return () => {
      active = false;
    };
  }, [bisneId, refreshKey]);

  const loadMore = async () => {
    if (!bisneId || !isSupabaseConfigured() || loadingMore) return;
    setLoadingMore(true);
    const { data } = await createDataClient()
      .from("reviews")
      .select("rating, comment, created_at, profiles(display_name)")
      .eq("bisne_id", bisneId)
      .order("created_at", { ascending: false })
      .range(reviews.length, reviews.length + PAGE_SIZE - 1);
    if (data?.length) setReviews((prev) => [...prev, ...data]);
    setLoadingMore(false);
  };

  if (reviews === undefined) return null;

  const avg = ratings.length > 0 ? ratings.reduce((s, r) => s + (r || 0), 0) / ratings.length : 0;

  return (
    <section className="review-list-section" aria-label="Reseñas de la tienda">
      <h2 className="featured-title">
        Reseñas
        {total > 0 && (
          <span className="review-list-avg">
            <Icon name="star" size={13} /> {avg.toFixed(1)} ({reviews.length} de {total})
          </span>
        )}
        <button
          type="button"
          className="btn-offers-expand review-write-btn"
          onClick={() => onLeaveReview?.()}
          title="Dejar una reseña"
        >
          <Icon name="star" size={13} />
          <span className="btn-expand-label">Dejar reseña</span>
        </button>
      </h2>

      {total > 0 ? (
        <>
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
          {reviews.length < total && (
            <button type="button" className="review-load-more" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Cargando…" : `Ver más reseñas (${reviews.length} de ${total})`}
            </button>
          )}
        </>
      ) : (
        <div className="review-list review-list-empty">
          <p className="review-item-comment">
            Todavía no hay reseñas. ¡Sé el primero en dejar una!
          </p>
        </div>
      )}
    </section>
  );
}