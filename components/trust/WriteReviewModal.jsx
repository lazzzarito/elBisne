"use client";

import { useEffect, useState } from "react";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useHistoryPopup } from "@/lib/use-history-popup";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/Icon";

// Modal para dejar/actualizar la reseña de una tienda. Una reseña por usuario
// y bisne (upsert con la unique (user_id, bisne_id)).
export default function WriteReviewModal({ bisneId, bisneName, onClose, onSaved }) {
  const { user, showToast } = useApp();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id || !bisneId || !isSupabaseConfigured()) return;
    let active = true;
    createClient()
      .from("reviews")
      .select("rating, comment")
      .eq("bisne_id", bisneId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return;
        setRating(data.rating || 0);
        setComment(data.comment || "");
      });
    return () => { active = false; };
  }, [user?.id, bisneId]);

  useEffect(() => {
    const unlock = lockBodyScroll();
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      unlock();
    };
  }, [onClose]);

  useHistoryPopup(true, onClose);

  if (!user) {
    return (
      <div className="store-info-overlay" onClick={onClose}>
        <div className="store-info-modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
          <div className="store-info-scroll">
            <div className="store-info-body" style={{ paddingBottom: "1.5rem" }}>
              <div className="cart-empty-message">
                <Icon name="user" size={40} />
                <h3 style={{ marginTop: "0.5rem" }}>Inicia sesión</h3>
                <p style={{ marginTop: "0.5rem", color: "var(--text-secondary)" }}>
                  Necesitas una cuenta para dejar una reseña de {bisneName || "esta tienda"}.
                </p>
                <button
                  type="button"
                  className="store-wizard-next"
                  style={{ width: "100%", marginTop: "1.25rem" }}
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent("open-profile-auth"));
                  }}
                >
                  Iniciar sesión o crear cuenta
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (rating <= 0) {
      showToast("Selecciona al menos una estrella", "warning");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("reviews").upsert(
        { bisne_id: bisneId, user_id: user.id, rating, comment: comment.trim() || null },
        { onConflict: "user_id,bisne_id" }
      );
      if (error) throw error;
      showToast("Gracias por tu reseña");
      onSaved?.();
      onClose();
    } catch (err) {
      console.error("Error guardando reseña:", err);
      showToast("No se pudo guardar tu reseña", "warning");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="store-info-overlay" onClick={onClose}>
      <form className="store-info-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <button type="button" className="modal-close" onClick={onClose}>
          <Icon name="close" size={18} />
        </button>
        <div className="store-info-scroll">
          <div className="store-info-body" style={{ paddingBottom: "1.5rem" }}>
            <div className="cinfo-field">
              <label className="cinfo-label">Tu valoración de {bisneName || "esta tienda"}</label>
              <div className="review-write-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`review-write-star${n <= rating ? " active" : ""}`}
                    onClick={() => setRating(n)}
                    aria-label={`${n} estrellas`}
                  >
                    <Icon name="star" size={26} style={{ color: n <= rating ? "var(--accent-green)" : "var(--border-color)" }} />
                  </button>
                ))}
              </div>
            </div>
            <div className="cinfo-field">
              <label className="cinfo-label">Comentario (opcional)</label>
              <textarea
                className="cinfo-input"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                placeholder="Cuéntanos tu experiencia con la tienda…"
              />
            </div>
          </div>
        </div>
        <div className="store-info-footer">
          <button type="submit" className="store-wizard-next" disabled={loading}>
            {loading ? "Guardando…" : "Enviar reseña"}
          </button>
        </div>
      </form>
    </div>
  );
}