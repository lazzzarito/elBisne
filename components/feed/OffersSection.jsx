"use client";

import MasonryGrid from "@/components/MasonryGrid";
import ProductCard from "@/components/ProductCard";
import Icon from "@/components/Icon";

export default function OffersSection({ offers, onAddToCart, onOpenDetails, favoriteIds, onToggleFavorite, onSeeAll, showBisne = false, bisneMap }) {
  if (!offers || !offers.length) return null;
  const visible = offers.slice(0, 8);

  return (
    <section className="featured-section" aria-label="Ofertas">
      <h2 className="featured-title">
        Ofertas Flash
        <span className="featured-title-line" />
        <button type="button" className="btn-offers-expand" onClick={() => onSeeAll?.()}>
          <Icon name="plus" />
          <span className="btn-expand-label">Ver todas</span>
        </button>
      </h2>
      <MasonryGrid key="home-offers">
        {visible.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
            onOpenDetails={onOpenDetails}
            isFavorited={favoriteIds.includes(product.id)}
            onToggleFavorite={onToggleFavorite}
            priority={i < 4}
            index={i}
            showBisne={showBisne}
            bisneInfo={bisneMap?.get(product.bisneId)}
          />
        ))}
      </MasonryGrid>
    </section>
  );
}