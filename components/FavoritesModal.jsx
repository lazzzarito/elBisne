"use client";

import { useEffect, useState, useCallback } from "react";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useHistoryPopup } from "@/lib/use-history-popup";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import MasonryGrid from "@/components/MasonryGrid";
import ProductCard from "@/components/ProductCard";
import Icon from "@/components/Icon";

// Shape mínimo que espera ProductCard (mismas reglas que lib/products.js mapRow)
function mapRow(row) {
  const id = row.slug || row.id;
  const images = Array.isArray(row.images) ? row.images : [];
  return {
    id,
    dbId: row.id || null,
    slug: row.slug || null,
    bisneId: row.bisne_id || null,
    bisneHandle: row.bisnes?.handle || null,
    name: row.name || "Producto",
    priceUSD: Number(row.price) || 0,
    category: (row.product_categories?.[0]?.categories?.name) || row.categories?.name || "General",
    categories: Array.isArray(row.product_categories)
      ? row.product_categories.map((pc) => pc?.categories?.name).filter(Boolean)
      : row.categories?.name ? [row.categories.name] : [],
    image: images[0] || "/images/placeholder.svg",
    images,
    description: row.description || "",
    featured: !!row.featured,
    offer: !!row.offer,
    originalPrice: row.original_price != null ? Number(row.original_price) : null,
    stock: row.stock != null ? Number(row.stock) : Infinity,
    status: row.status || null,
    attributes: row.attributes && typeof row.attributes === "object" ? { ...row.attributes } : {},
    options: row.options && typeof row.options === "object" ? row.options : {},
    promo: row.promo || null,
    ratioClass: row.ratio ? `ratio-${row.ratio}` : "ratio-square",
  };
}

// Modal de favoritos GLOBAL: los favoritos viven en localStorage/Supabase
// (favoriteIds) y no dependen del catálogo del bisne actual. Cada apertura
// resuelve los productos por su id/slug desde toda la DB.
export default function FavoritesModal({ favoriteIds, onToggleFavorite, onClose, onAddToCart, onOpenProduct }) {
  const [items, setItems] = useState(undefined); // undefined = cargando

  const load = useCallback(async () => {
    if (!isSupabaseConfigured() || favoriteIds.length === 0) {
      setItems([]);
      return;
    }
    setItems(undefined);
    try {
      const supabase = createClient();
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const uuids = favoriteIds.filter((id) => uuidRe.test(id));
      const slugs = favoriteIds.filter((id) => !uuidRe.test(id));
      let query = supabase
        .from("products")
        .select("*, categories!products_category_id_fkey(name), product_categories(categories(id, name, slug, group_name)), bisnes(handle)")
        .limit(200);
      const conds = [];
      if (uuids.length > 0) conds.push(`id.in.(${uuids.join(",")})`);
      if (slugs.length > 0) conds.push(`slug.in.(${slugs.join(",")})`);
      if (conds.length > 0) query = query.or(conds.join(","));
      const { data, error } = await query;
      if (error) throw error;
      setItems((data || []).map(mapRow));
    } catch (e) {
      console.error("Error cargando favoritos:", e);
      setItems([]);
    }
  }, [favoriteIds]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    const unlock = lockBodyScroll();
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      unlock();
    };
  }, [onClose]);

  useHistoryPopup(favoriteIds.length > 0, onClose);

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
              <h2 className="store-info-title">Tus favoritos</h2>
              <span className="store-info-badge">
                {items === undefined
                  ? "Cargando…"
                  : `${items.length} ${items.length === 1 ? "producto" : "productos"}`}
              </span>
            </div>
          </div>

          <div className="store-info-body" style={{ paddingBottom: "1.5rem" }}>
            {items === undefined ? (
              <div className="global-favs-skeleton" aria-busy="true">
                <div className="perfil-skeleton-line" style={{ width: "70%" }} />
                <div className="perfil-skeleton-line" style={{ width: "50%" }} />
                <div className="perfil-skeleton-line" style={{ width: "60%" }} />
              </div>
            ) : items.length > 0 ? (
              <div className="favorites-masonry-wrap">
                <MasonryGrid>
                  {items.map((product) => (
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
                <Icon name="heart-donate" size={44} />
                <p>No tienes favoritos todavía.</p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Pulsa el corazón de cualquier producto para guardarlo aquí.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}