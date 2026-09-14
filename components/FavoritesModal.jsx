"use client";

import { useEffect, useRef } from "react";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useHistoryPopup } from "@/lib/use-history-popup";
import MasonryGrid from "@/components/MasonryGrid";
import ProductCard from "@/components/ProductCard";

export default function FavoritesModal({ products, favoriteIds, onToggleFavorite, onClose, onAddToCart, onOpenProduct }) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const unlock = lockBodyScroll();
    const handler = (e) => { if (e.key === "Escape") onCloseRef.current(); };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      unlock();
    };
  }, []);

  useHistoryPopup(favoriteIds.length > 0, onClose);

  const favoriteProducts = products.filter((p) => favoriteIds.includes(p.id));

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
          <div className="store-info-header" style={{ paddingRight: "2.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <h2 className="store-info-title">Favoritos</h2>
              <span className="store-info-badge">{favoriteIds.length} {favoriteIds.length === 1 ? "producto" : "productos"}</span>
            </div>
          </div>

          <div className="store-info-body" style={{ paddingBottom: "1.5rem" }}>
            {favoriteProducts.length > 0 ? (
              <div className="favorites-masonry-wrap">
                <MasonryGrid>
                  {favoriteProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpenDetails={onOpenProduct}
                      onAddToCart={onAddToCart}
                      isFavorited={favoriteIds.includes(product.id)}
                      onToggleFavorite={onToggleFavorite}
                    />
                  ))}
                </MasonryGrid>
              </div>
            ) : (
              <div className="cart-empty-message">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 1rem", display: "block" }}>
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <p>No tienes favoritos todavía.</p>
              </div>
            )}
          </div>
        </div>
        {favoriteProducts.length === 0 && (
          <div className="store-info-footer">
            <button className="btn-back-store" onClick={onClose}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Volver a la tienda
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
