"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import MasonryGrid from "@/components/MasonryGrid";
import ProductCard from "@/components/ProductCard";

const PAGE_SIZE = 24;

export default function RecommendationsFeed({
  products,
  onAddToCart,
  onOpenDetails,
  favoriteIds,
  onToggleFavorite,
  title = "Productos en Tendencia",
  subtitle = "Lo que más se está vendiendo ahora mismo",
  showBisne = false,
  bisneMap,
}) {
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const loaderRef = useRef(null);
  const hasMore = visibleLimit < products.length;

  useEffect(() => {
    if (!hasMore) return;
    const el = loaderRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !loadingMore) {
          setLoadingMore(true);
          requestAnimationFrame(() => {
            startTransition(() => {
              setVisibleLimit((prev) => Math.min(prev + PAGE_SIZE, products.length));
            });
            setLoadingMore(false);
          });
        }
      },
      { threshold: 0.1, rootMargin: "200px 0px" }
    );
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, loadingMore, products.length]);

  const visibleProducts = products.slice(0, visibleLimit);

  if (!products.length) return null;

  return (
    <section className="recommendations-section" aria-label={title}>
      <h2 className="featured-title">{title}</h2>
      {subtitle && <p className="section-subtitle">{subtitle}</p>}
      <MasonryGrid key="home-recommendations">
        {visibleProducts.map((product, i) => (
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
      {hasMore && (
        <div ref={loaderRef} className="infinite-scroll-trigger">
          <div className="dot-loader">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        </div>
      )}
    </section>
  );
}