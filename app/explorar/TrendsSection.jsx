"use client";

import MasonryGrid from "@/components/MasonryGrid";
import ProductCard from "@/components/ProductCard";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";

export default function TrendsSection({
  products,
  storeConfig,
  salesMap,
  onOpenProduct,
  onOpenPromo,
  onAddToCart,
  favoriteIds,
  onToggleFavorite,
}) {
  // ── Tendencias: por ventas reales en DB (salesMap) + refuerzo con ofertas ──
  const trending = [...products]
    .sort((a, b) => {
      const sa = (salesMap && salesMap[a.id]) || 0;
      const sb = (salesMap && salesMap[b.id]) || 0;
      if (sb !== sa) return sb - sa;
      if (b.offer !== a.offer) return b.offer ? 1 : -1;
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 8);

  // ── Colecciones: curadas (promoLinks de store-config) ──
  const collections = (storeConfig.promoLinks || [])
    .filter((link) => link.type === "promo")
    .map((link) => ({
      ...link,
      products: products.filter((p) => p.promo === link.target),
    }))
    .filter((c) => c.products.length > 0);

  return (
    <div className="explore-trends">
      <section className="featured-section" aria-label="Tendencias">
        <h2 className="featured-title">
          <Icon name="activity" />
          Tendencias
          <span className="featured-title-line" />
        </h2>
        <MasonryGrid key="explore-trending">
          {trending.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              onOpenDetails={onOpenProduct}
              isFavorited={favoriteIds.includes(product.id)}
              onToggleFavorite={onToggleFavorite}
              priority={i < 4}
            />
          ))}
        </MasonryGrid>
      </section>

      <section className="featured-section" aria-label="Colecciones">
        <h2 className="featured-title">
          <Icon name="sparkles" />
          Colecciones
          <span className="featured-title-line" />
        </h2>
        <div className="collections-grid">
          {collections.map((col) => (
            <button
              key={col.target}
              type="button"
              className="collection-card"
              onClick={() => onOpenPromo(col)}
            >
              <div className="collection-cover">
                {col.products.slice(0, 3).map((p, i) => (
                  <SafeImage
                    key={p.id}
                    src={p.image}
                    alt=""
                    width={160}
                    height={200}
                    className={`collection-thumb collection-thumb-${i}`}
                    style={{ zIndex: 3 - i }}
                  />
                ))}
                <div className="collection-gradient" />
                <span className="collection-count">
                  {col.products.length} {col.products.length === 1 ? "producto" : "productos"}
                </span>
              </div>
              <div className="collection-info">
                <h3 className="collection-title">{col.title}</h3>
                {col.subtitle && <p className="collection-subtitle">{col.subtitle}</p>}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}