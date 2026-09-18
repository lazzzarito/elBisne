"use client";

import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/Icon";

function StarPicker({ value, onChange }) {
  return (
    <div className="review-stars" role="radiogroup" aria-label="Puntuación">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`review-star${n <= value ? " filled" : ""}`}
          onClick={() => onChange(n)}
          aria-label={`${n} estrellas`}
          aria-checked={n === value}
          role="radio"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={n <= value ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function ReviewForm({ orderId, productId, bisneId, onSubmitted }) {
  const { user, isLoggedIn, showToast } = useApp();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  useEffect(() => {
    if (!user?.id || !orderId || !isSupabaseConfigured()) return;
    let active = true;
    const supabase = createClient();
    supabase
      .from("reviews")
      .select("id")
      .eq("order_id", orderId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setAlreadyReviewed(true);
      });
    return () => {
      active = false;
    };
  }, [user?.id, orderId]);

  if (!isLoggedIn || alreadyReviewed || submitted) {
    if (submitted) {
      return (
        <div className="review-form-done">
          <Icon name="check" size={14} /> ¡Gracias por tu reseña!
        </div>
      );
    }
    return null;
  }

  const submit = async () => {
    if (rating < 1) {
      showToast("Elige una puntuación de 1 a 5 estrellas", "warning");
      return;
    }
    setSending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("reviews").insert({
        order_id: orderId,
        product_id: productId,
        bisne_id: bisneId,
        user_id: user.id,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
      setSubmitted(true);
      showToast("¡Reseña publicada!");
      onSubmitted?.();
    } catch (e) {
      console.error("Error enviando reseña:", e);
      showToast(/row-level|policy/i.test(e.message) ? "Solo compradores con pedido confirmado pueden reseñar" : "No se pudo enviar la reseña", "warning");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="review-form">
      <h3 className="review-form-title">¿Cómo te fue con este pedido?</h3>
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        className="review-textarea"
        rows={3}
        maxLength={300}
        placeholder="Cuéntanos tu experiencia (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button type="button" className="store-wizard-next" onClick={submit} disabled={sending}>
        {sending ? "Enviando…" : "Publicar reseña"}
      </button>
    </div>
  );
}
