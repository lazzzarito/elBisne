"use client";

import { useMemo } from "react";
import GlobalSearch from "@/components/search/GlobalSearch";
import Icon from "@/components/Icon";

// ── Vista de búsqueda global dentro de la home ─────────────────────────────
// Reemplaza al drawer SearchModal en la portada: en vez de tapar la página con
// un modal, la propia home se transforma en el buscador. Mismo contenido que
// tenía el modal (GlobalSearch en modo compact:Tenencias, En Oferta, Bisnes
// nuevos, búsquedas frecuentes y resultados en vivo).
//
// A diferencia del modal, aquí no hace falta fetchCatalog(): initialProducts y
// bisnes ya vienen por props desde el RSC de la home, así que la búsqueda en
// vivo es inmediata y sin waterfall de red.
export default function HomeSearchView({
  products,
  bisnes,
  salesMap,
  value,
  onChange,
  onOpenProduct,
  onClose,
}) {
  // Secciones de descubrimiento (estado sin búsqueda):
  //  · Tendencias: productos en campaña promocional → destacados → top ventas
  //  · Ofertas: productos rebajados de verdad (offer + precio original mayor)
  const trends = useMemo(() => {
    if (!products) return [];
    const sm = salesMap || {};
    const promo = products.filter((p) => p.promo);
    if (promo.length > 0) return promo;
    const featured = products.filter((p) => p.featured);
    if (featured.length > 0) return featured;
    // Fallback final: los más vendidos, para que la vista nunca quede vacía.
    return [...products]
      .sort((a, b) => (Number(sm[b.id]) || 0) - (Number(sm[a.id]) || 0))
      .slice(0, 8);
  }, [products, salesMap]);

  const offers = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => p.offer && p.originalPrice && p.originalPrice > p.priceUSD);
  }, [products]);

  return (
    <div className="home-search-view">
      <div className="home-search-view-bar">
        <button type="button" className="home-search-back" onClick={onClose}>
          <Icon name="arrow-left" size={16} />
          <span>Volver al inicio</span>
        </button>
      </div>

      <GlobalSearch
        compact
        showDiscovery
        trends={trends}
        offers={offers}
        products={products}
        bisnes={bisnes}
        value={value}
        onChange={onChange}
        onOpenProduct={onOpenProduct}
        onClear={() => onChange("")}
        onEscape={onClose}
      />
    </div>
  );
}
