"use client";

import BusinessCard from "@/components/feed/BusinessCard";

// "Bisnes para ti" (UI_UX.md §4.2): carrusel de bisnes recomendados.
// Ranking por recomendación (rating + novedad), sin contador de productos.
export default function BusinessesNearby({ bisnes }) {
  if (!bisnes || !bisnes.length) return null;

  const sorted = [...bisnes].sort((a, b) => {
    const ra = a.rating ?? -1;
    const rb = b.rating ?? -1;
    return rb - ra || String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });

  return (
    <section className="businesses-carousel-section" aria-label="Bisnes recomendados">
      <h2 className="featured-title">
        Bisnes para ti
        <span className="featured-title-line" />
      </h2>
      <div className="businesses-carousel">
        {sorted.map((bisne) => (
          <BusinessCard key={bisne.id} bisne={bisne} followable />
        ))}
      </div>
    </section>
  );
}