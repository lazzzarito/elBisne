"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";
import CatalogContainer from "../../CatalogContainer";
import ReviewList from "@/components/trust/ReviewList";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getChannelUrl } from "@/lib/messaging";

const DELIVERY_LABELS = {
  pickup: "Recojo en tienda",
  delivery: "Envío a domicilio",
  both: "Envío y recogida",
  none: "Solo tienda",
};

function FollowButton({ bisneId, handle }) {
  const { user, showToast } = useApp();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    let active = true;
    const supabase = createClient();
    supabase
      .from("follows")
      .select("bisne_id")
      .eq("user_id", user.id)
      .eq("bisne_id", bisneId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setFollowing(Boolean(data));
      });
    return () => { active = false; };
  }, [user, bisneId]);

  const toggle = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      showToast("Para seguir tiendas inicia sesión", "warning");
      return;
    }
    if (!user) {
      showToast("Para seguir tiendas inicia sesión", "warning");
      window.location.href = `/auth?redirect=/b/${handle}`;
      return;
    }
    setLoading(true);
    const supabase = createClient();
    try {
      if (following) {
        await supabase.from("follows").delete().match({ user_id: user.id, bisne_id: bisneId });
        setFollowing(false);
        showToast("Dejaste de seguir esta tienda");
      } else {
        await supabase.from("follows").insert({ user_id: user.id, bisne_id: bisneId });
        setFollowing(true);
        showToast("¡Siguiendo esta tienda!");
      }
    } catch (e) {
      console.error("Error al cambiar seguimiento:", e);
      showToast("No se pudo actualizar el seguimiento", "warning");
    } finally {
      setLoading(false);
    }
  }, [user, following, bisneId, handle, showToast]);

  return (
    <button
      type="button"
      className={`store-follow-btn${following ? " following" : ""}`}
      onClick={toggle}
      disabled={loading}
    >
      <Icon name={following ? "check" : "heart-outline"} size={16} />
      {following ? "Siguiendo" : "Seguir"}
    </button>
  );
}

function RatingChip({ rating, ratingCount }) {
  if (rating == null) {
    return (
      <span className="store-rating-chip">
        <Icon name="star" size={14} />
        Sin reseñas
      </span>
    );
  }
  return (
    <span className="store-rating-chip has-rating" title={`${ratingCount} reseñas`}>
      <Icon name="star" size={14} />
      {rating.toFixed(1)}
      <span className="store-rating-count">({ratingCount})</span>
    </span>
  );
}

export default function StorePageClient({ bisne, initialProducts, storeConfig }) {
  const accent = bisne.theme?.accent || "#00a884";
  const scale = Math.max(0.6, Number(bisne.theme?.radiusScale) || 1);

  const themeStyle = useMemo(
    () => ({
      "--store-accent": accent,
      "--store-accent-bg": `color-mix(in srgb, ${accent} 12%, transparent)`,
      "--radius-sm": `${Math.round(6 * scale)}px`,
      "--radius-md": `${Math.round(10 * scale)}px`,
      "--radius-lg": `${Math.round(18 * scale)}px`,
    }),
    [accent, scale]
  );

  const contactHref = useMemo(
    () => getChannelUrl("whatsapp", storeConfig, `¡Hola ${bisne.business_name}! Quiero saber más sobre su tienda.`),
    [storeConfig, bisne.business_name]
  );

  return (
    <div className="store-page" style={themeStyle}>
      <section className="store-hero" aria-label={bisne.business_name}>
        {bisne.coverUrl ? (
          <div className="store-hero-cover">
            <SafeImage src={bisne.coverUrl} alt="" fill sizes="100vw" priority />
          </div>
        ) : (
          <div className="store-hero-cover store-hero-cover-gradient" />
        )}

        <div className="store-hero-inner">
          <div className="store-hero-logo">
            {bisne.logoUrl ? (
              <SafeImage src={bisne.logoUrl} alt={bisne.business_name} width={64} height={64} className="store-hero-logo-img" />
            ) : (
              <span className="store-hero-initial">{bisne.business_name.charAt(0)}</span>
            )}
          </div>

          <div className="store-hero-info">
            <h1 className="store-hero-name">
              {bisne.business_name}
              {bisne.verified && (
                <span className="business-verified-badge" title="Tienda verificada">
                  <Icon name="check" size={12} />
                </span>
              )}
              <RatingChip rating={bisne.rating} ratingCount={bisne.ratingCount} />
            </h1>
            {bisne.slogan && <p className="store-hero-slogan">{bisne.slogan}</p>}
            {bisne.description && <p className="store-hero-description">{bisne.description}</p>}

            <div className="business-card-meta">
              <span className="store-hero-meta-item">
                <Icon name="shopping-bag" size={14} />
                {initialProducts.length} {initialProducts.length === 1 ? "producto" : "productos"}
              </span>
              {bisne.deliveryMode && (
                <span className="store-hero-meta-item">
                  <Icon name="truck" size={14} />
                  {DELIVERY_LABELS[bisne.deliveryMode] || "Envío"}
                </span>
              )}
              {bisne.hours && (
                <span className="store-hero-meta-item">
                  <Icon name="clock" size={14} />
                  {bisne.hours}
                </span>
              )}
              <span className="store-hero-meta-item">
                <Icon name="banknote" size={14} />
                Precios en {storeConfig.currency?.code || "USD"} ({storeConfig.currency?.symbol || "$"})
              </span>
              {bisne.address && (
                <span className="business-card-address">
                  <Icon name="map-pin" size={12} />
                  {bisne.address}
                </span>
              )}
            </div>
          </div>

          <div className="store-hero-actions">
            <FollowButton bisneId={bisne.id} handle={bisne.handle} />
            <a href={contactHref} target="_blank" rel="noopener noreferrer" className="store-contact-btn">
              <Icon name="whatsapp" size={16} />
              Contactar
            </a>
            <Link href="/explorar" className="store-explore-link">
              <Icon name="explore" size={16} />
              Explorar más
            </Link>
          </div>
        </div>
      </section>

      <CatalogContainer initialProducts={initialProducts} storeConfig={storeConfig} initialCategory="all" bisneId={bisne?.id} />

      <ReviewList bisneId={bisne.id} />
    </div>
  );
}