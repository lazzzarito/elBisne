"use client";

import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";

export default function BusinessesNearby({ bisnes }) {
  if (!bisnes || !bisnes.length) return null;

  return (
    <section className="businesses-carousel-section" aria-label="Bisnes cercanos">
      <h2 className="featured-title">
        Bisnes para ti
        <span className="featured-title-line" />
      </h2>
      <div className="businesses-carousel">
        {bisnes.map((bisne) => (
          <Link
            key={bisne.id}
            href={`/b/${bisne.handle}`}
            className="business-card"
          >
            <div className="business-card-logo">
              {bisne.logoUrl ? (
                <SafeImage
                  src={bisne.logoUrl}
                  alt={bisne.business_name}
                  fill
                  sizes="80px"
                  className="business-card-logo-img"
                />
              ) : (
                <span className="business-card-initial">
                  {bisne.business_name?.charAt(0) || "B"}
                </span>
              )}
            </div>
            <div className="business-card-info">
              <span className="business-card-name">
                {bisne.business_name}
                {bisne.verified && (
                  <span className="business-verified-badge" title="Verificado">
                    <Icon name="check" />
                  </span>
                )}
              </span>
              {bisne.slogan && <span className="business-card-slogan">{bisne.slogan}</span>}
              <span className="business-card-meta">
                {bisne.rating !== null && (
                  <span className="business-card-rating" title={`${bisne.rating.toFixed(1)} estrellas`}>
                    <Icon name="star" />
                    {bisne.rating.toFixed(1)}
                  </span>
                )}
                <span className="business-card-products">
                  {bisne.productCount} {bisne.productCount === 1 ? "producto" : "productos"}
                </span>
                {bisne.address && (
                  <span className="business-card-address">
                    <Icon name="map-pin" /> {bisne.address}
                  </span>
                )}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}