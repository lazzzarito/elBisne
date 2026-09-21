"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useHistoryPopup } from "@/lib/use-history-popup";
import MasonryGrid from "@/components/MasonryGrid";
import ProductCard from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import Icon from "@/components/Icon";

const QuickBuyModal = dynamic(() => import("@/components/QuickBuyModal"), { ssr: false, loading: () => null });

// Shape mínimo que espera ProductCard (mismas reglas que lib/products.js mapRow)
function mapProductRow(row) {
  const id = row.slug || row.id;
  const images = Array.isArray(row.images) ? row.images : [];
  return {
    id,
    slug: row.slug || null,
    bisneId: row.bisne_id || null,
    name: row.name || "Producto",
    priceUSD: Number(row.price) || 0,
    category: row.categories?.name || "General",
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
    contentHtml: row.content_html || "",
    ratioClass: row.ratio ? `ratio-${row.ratio}` : "ratio-square",
  };
}

// Modal global de favoritos (UI_UX.md §1): el corazón del header abre este
// modal. Los productos se resuelven por id desde Supabase (el header no tiene
// catálogo en mano). Portal a document.body: el backdrop-filter del header
// crea containing block y atrapa los position:fixed.
export default function GlobalFavoritesModal({ storeConfig, onClose }) {
  const { favoriteIds, toggleFavorite, addToCart, withStock, handleOrderComplete } = useApp();
  const [products, setProducts] = useState(undefined); // undefined = cargando
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quickBuyProduct, setQuickBuyProduct] = useState(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured() || favoriteIds.length === 0) {
      setProducts([]);
      return;
    }
    setError(null);
    setProducts(undefined);
    try {
      const supabase = createClient();
      // favoriteIds guarda el id público (slug o uuid) que usa la UI;
      // en DB el uuid real está en products.id y el slug en products.slug.
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const uuids = favoriteIds.filter((id) => uuidRe.test(id));
      const slugs = favoriteIds.filter((id) => !uuidRe.test(id));
      let query = supabase
        .from("products")
        .select("*, categories(name), bisnes(handle)")
        .limit(200);
      const conds = [];
      if (uuids.length > 0) conds.push(`id.in.(${uuids.join(",")})`);
      if (slugs.length > 0) conds.push(`slug.in.(${slugs.join(",")})`);
      if (conds.length > 0) query = query.or(conds.join(","));
      const { data, error: err } = await query;
      if (err) throw err;
      setProducts((data || []).map(mapProductRow));
    } catch (e) {
      console.error("Error cargando favoritos:", e);
      setError("No pudimos cargar tus favoritos.");
      setProducts([]);
    }
  }, [favoriteIds]);

  useEffect(() => {
    // Carga diferida a un callback (evita setState síncrono en el efecto)
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

  useHistoryPopup(true, onClose);

  const body = products === undefined ? (
    <div className="global-favs-skeleton" aria-busy="true">
      <div className="perfil-skeleton-line" style={{ width: "70%" }} />
      <div className="perfil-skeleton-line" style={{ width: "50%" }} />
      <div className="perfil-skeleton-line" style={{ width: "60%" }} />
    </div>
  ) : error ? (
    <div className="cart-empty-message">
      <Icon name="warning" size={40} />
      <p>{error}</p>
      <button type="button" className="btn-outline" onClick={load}>Reintentar</button>
    </div>
  ) : products.length === 0 ? (
    <div className="cart-empty-message">
      <Icon name="heart-donate" size={44} />
      <p>No tienes favoritos todavía.</p>
      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
        Pulsa el corazón de cualquier producto para guardarlo aquí.
      </p>
      <Link href="/" className="perfil-empty-link" style={{ display: "inline-block", marginTop: "0.75rem" }}>
        Descubrir productos
      </Link>
    </div>
  ) : (
    <div className="favorites-masonry-wrap">
      <MasonryGrid>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={withStock(product)}
            onOpenDetails={(p) => {
              setSelectedProduct(p);
              onClose();
            }}
            onAddToCart={addToCart}
            isFavorited={favoriteIds.includes(product.id)}
            onToggleFavorite={toggleFavorite}
          />
        ))}
      </MasonryGrid>
    </div>
  );

  return createPortal(
    <>
      <ProductModal
        product={withStock(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToCart}
        storeConfig={storeConfig}
        onQuickBuy={setQuickBuyProduct}
        isFavorited={selectedProduct ? favoriteIds.includes(selectedProduct.id) : false}
        onToggleFavorite={toggleFavorite}
      />

      {quickBuyProduct && (
        <QuickBuyModal
          product={quickBuyProduct}
          onClose={() => setQuickBuyProduct(null)}
          onOrderComplete={() => {
            handleOrderComplete();
            setSelectedProduct(null);
          }}
          storeConfig={storeConfig}
        />
      )}
      <div className="store-info-overlay" onClick={onClose}>
      <div className="store-info-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <Icon name="close" size={18} />
        </button>

        <div className="store-info-scroll">
          <div className="store-info-header" style={{ paddingRight: "2.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <h2 className="store-info-title">Tus favoritos</h2>
              <span className="store-info-badge">
                {products === undefined ? "Cargando…" : `${products.length} ${products.length === 1 ? "producto" : "productos"}`}
              </span>
            </div>
          </div>
          <div className="store-info-body" style={{ paddingBottom: "1.5rem" }}>
            {body}
          </div>
        </div>
      </div>
    </div>
    </>,
    document.body
  );
}
