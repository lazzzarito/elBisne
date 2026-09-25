"use client";

import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";
import FollowButton from "@/components/profile/FollowButton";

// ── Card global de bisne estilo "sugerencia de seguir" de Instagram ─────
// Contenido centrado: logo arriba, nombre, slogan/categoría y rating.
// SIN contador de productos. Es el diseño estándar para cualquier lugar
// donde se muestren tarjetas de bisnes (home, popup de búsqueda, etc.).
export default function BusinessCard({ bisne, followable = false, showRating = true }) {
  const initials = (bisne.business_name || "B").charAt(0);

  return (
    <div className="business-card business-card-ig">
      <Link href={`/${bisne.handle}`} className="business-card-ig-main">
        <span className="business-card-logo business-card-ig-logo">
          {bisne.logoUrl ? (
            <SafeImage
              src={bisne.logoUrl}
              alt={bisne.business_name}
              fill
              sizes="72px"
              className="business-card-logo-img"
            />
          ) : (
            <span className="business-card-initial">{initials}</span>
          )}
        </span>

        <span className="business-card-name business-card-ig-name">
          {bisne.business_name}
          {bisne.verified && (
            <span className="business-verified-badge" title="Verificado">
              <Icon name="check" />
            </span>
          )}
        </span>

        <span className="business-card-slogan business-card-ig-sub">
          {bisne.slogan || bisne.category}
        </span>

        {showRating && bisne.rating != null && (
          <span className="business-card-rating business-card-ig-rating">
            <Icon name="star" size={12} />
            {bisne.rating.toFixed(1)}
          </span>
        )}
      </Link>

      {followable && (
        <div className="business-card-follow business-card-ig-follow">
          <FollowButton bisneId={bisne.id} size="sm" />
        </div>
      )}
    </div>
  );
}