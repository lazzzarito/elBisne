"use client";

import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";

// Mapa de bisnes (UI_UX.md §4.6): componente compartido entre Home
// ("Bisnes cerca de ti") y Explorar. Embed interactivo + tarjetas.
// showMapsLink: oculta el botón "Abrir en Google Maps" (sobra en Home).
export default function MapSection({ bisnes, storeConfig, title = "Bisnes cerca de ti", showMapsLink = true }) {
  if (!bisnes || bisnes.length === 0) return null;

  const sorted = [...bisnes].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const googleMapsUrl = storeConfig.googleMapsUrl || storeConfig.mapEmbedUrl || "#";

  return (
    <section className="featured-section explore-map-section" aria-label="Bisnes cerca de ti">
      <h2 className="featured-title">
        <Icon name="map-pin" />
        {title}
        <span className="featured-title-line" />
      </h2>

      <div className="explore-map-grid">
        {storeConfig.mapEmbedUrl && (
          <div className="explore-map-embed">
            <iframe
              src={storeConfig.mapEmbedUrl}
              title="Mapa de bisnes cercanos"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        )}

        <div className="explore-bisnes-list">
          {sorted.map((bisne) => (
            <Link key={bisne.id} href={`/b/${bisne.handle}`} className="explore-bisne-card">
              <span className="business-card-logo" style={{ width: 44, height: 44 }}>
                {bisne.logoUrl ? (
                  <SafeImage src={bisne.logoUrl} alt={bisne.business_name} width={44} height={44} className="business-card-logo-img" />
                ) : (
                  <span className="business-card-initial">{bisne.business_name.charAt(0)}</span>
                )}
              </span>

              <span className="business-card-info">
                <span className="business-card-name">
                  {bisne.business_name}
                  {bisne.verified && (
                    <span className="business-verified-badge" title="Verificado">
                      <Icon name="check" size={12} />
                    </span>
                  )}
                </span>
                <span className="business-card-slogan">
                  {bisne.slogan || bisne.category}
                </span>
                <span className="business-card-meta">
                  {bisne.rating != null && (
                    <span className="business-card-rating">
                      <Icon name="star" size={12} />
                      {bisne.rating.toFixed(1)}
                    </span>
                  )}
                  <span>{bisne.productCount} productos</span>
                  {bisne.address && (
                    <span className="business-card-address">
                      <Icon name="map-pin" size={12} />
                      {bisne.address}
                    </span>
                  )}
                </span>
              </span>

              <span className="explore-bisne-arrow">
                <Icon name="arrow-up" style={{ transform: "rotate(90deg)" }} />
              </span>
            </Link>
          ))}

          {showMapsLink && googleMapsUrl && googleMapsUrl !== "#" && (
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn-outline explore-map-open">
              <Icon name="map-pin" />
              Abrir en Google Maps
            </a>
          )}
        </div>
      </div>
    </section>
  );
}