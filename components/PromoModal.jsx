"use client";

import { useEffect } from "react";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useHistoryPopup } from "@/lib/use-history-popup";
import MasonryGrid from "@/components/MasonryGrid";
import ProductCard from "@/components/ProductCard";

export default function PromoModal({ promo, products, onClose, onAddToCart, onOpenDetails, favoriteIds, onToggleFavorite }) {
  useEffect(() => {
    if (promo) {
      const unlock = lockBodyScroll();
      const handler = (e) => { if (e.key === "Escape") onClose(); };
      document.addEventListener("keydown", handler);
      return () => {
        document.removeEventListener("keydown", handler);
        unlock();
      };
    }
  }, [promo, onClose]);

  useHistoryPopup(!!promo, onClose);

  if (!promo) return null;

  return (
    <div className="store-info-overlay" onClick={onClose}>
      <div className="store-info-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="store-info-scroll">
          <div className="store-info-header">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <h2 className="store-info-title">{promo.title}</h2>
              {promo.subtitle && <span className="store-info-badge">{promo.subtitle}</span>}
            </div>
          </div>

          <div className="store-info-body" style={{ paddingBottom: "1.5rem" }}>
            {products.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center", padding: "1rem 0" }}>
                No products in this promotion yet.
              </p>
            ) : (
              <div className="favorites-masonry-wrap">
                <MasonryGrid>
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpenDetails={onOpenDetails}
                      onAddToCart={onAddToCart}
                      isFavorited={favoriteIds.includes(product.id)}
                      onToggleFavorite={onToggleFavorite}
                    />
                  ))}
                </MasonryGrid>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
