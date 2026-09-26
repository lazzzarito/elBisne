"use client";

import BusinessCard from "@/components/feed/BusinessCard";

// "Bisnes para ti" : carrusel de bisnes recomendados.
// Ranking por recomendación (rating + novedad), sin contador de productos.
export default function BusinessesNearby({ bisnes, subtitle = "Las tiendas mejor valoradas de la comunidad" }) {
  if (!bisnes || !bisnes.length) return null;

  const sorted = [...bisnes].sort((a, b) => {
    const ra = a.rating ?? -1;
    const rb = b.rating ?? -1;
    return rb - ra || String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });

  return (
    <section className="businesses-carousel-section" aria-label="Bisnes recomendados">
      <h2 className="featured-title">Bisnes para ti</h2>
      {subtitle && <p className="section-subtitle">{subtitle}</p>}
      <div className="businesses-carousel">
        {sorted.map((bisne) => (
          <BusinessCard key={bisne.id} bisne={bisne} followable />
        ))}
      </div>
    </section>
  );
}