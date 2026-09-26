"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";
import FollowButton from "@/components/profile/FollowButton";

// Tarjeta de bisne para el feed infinito (formato 1:1)
// A diferencia de `BusinessCard` (carruseles horizontales, 200px), esta vive
// dentro del masonry junto a productos. Por eso el bloque visual es 1:1 —igual
// que una `ratio-square` de producto— para no romper el ritmo de la grilla, y
// la metadata (nombre, slogan, rating, seguir) va debajo, al estilo ProductCard.
export default function FeedBusinessCard({ bisne, index = 0 }) {
  const name = bisne.business_name || "Negocio";
  const initials = name.charAt(0).toUpperCase();
  const cover = bisne.coverUrl || bisne.logoUrl;

  return (
    <motion.article
      className="feed-bisne-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 6) * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -5, boxShadow: "0 10px 30px rgba(17, 27, 33, 0.08)" }}
    >
      <Link href={`/${bisne.handle}`} className="feed-bisne-media" aria-label={`Ver la tienda de ${name}`}>
        {cover && (
          <SafeImage
            src={cover}
            alt=""
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="feed-bisne-cover"
          />
        )}
        <span className="feed-bisne-logo">
          {bisne.logoUrl ? (
            <SafeImage src={bisne.logoUrl} alt="" fill sizes="64px" className="feed-bisne-logo-img" />
          ) : (
            <span className="feed-bisne-initial">{initials}</span>
          )}
        </span>

        <span className="feed-bisne-tag">Negocio</span>
        {bisne.productCount > 0 && (
          <span className="feed-bisne-count">{bisne.productCount} productos</span>
        )}
      </Link>

      <div className="feed-bisne-info">
        <Link href={`/${bisne.handle}`} className="feed-bisne-name">
          {name}
          {bisne.verified && (
            <span className="business-verified-badge" title="Verificado">
              <Icon name="check" />
            </span>
          )}
        </Link>

        <p className="feed-bisne-slogan">{bisne.slogan || bisne.category || "Tienda en elBisne"}</p>

        <div className="feed-bisne-footer">
          {bisne.rating != null ? (
            <span className="business-card-rating feed-bisne-rating">
              <Icon name="star" size={12} />
              {bisne.rating.toFixed(1)}
            </span>
          ) : (
            <span className="feed-bisne-new">Nuevo</span>
          )}
          <FollowButton bisneId={bisne.id} size="sm" />
        </div>
      </div>
    </motion.article>
  );
}
