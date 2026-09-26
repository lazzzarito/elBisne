"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useApp } from "@/context/AppContext";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useHistoryPopup } from "@/lib/use-history-popup";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { fetchCatalog } from "@/lib/catalog";
import GlobalSearch from "@/components/search/GlobalSearch";
import Icon from "@/components/Icon";

const ProductModal = dynamic(() => import("@/components/ProductModal"), { ssr: false, loading: () => null });

// Popup de búsqueda (mismo drawer que el carrito)
// El icono de buscador del TopNav abre este bottom-sheet. Se monta una vez en
// el layout y escucha el evento "open-search" (mismo patrón que el carrito).
export default function SearchModal({ storeConfig }) {
  const { addToCart, withStock, favoriteIds, toggleFavorite, handleOrderComplete, salesMap } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [catalog, setCatalog] = useState(null); // { products, bisnes } | null = cargando
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const loadAttempted = useRef(false);

  // Secciones de descubrimiento del popup (estado sin búsqueda):
  //  · Tendencias: productos en campaña promocional → destacados → top ventas
  //  · Ofertas: productos rebajados de verdad (offer + precio original mayor)
  const trends = useMemo(() => {
    if (!catalog) return [];
    const sm = salesMap || {};
    const promo = catalog.products.filter((p) => p.promo);
    if (promo.length > 0) return promo;
    const featured = catalog.products.filter((p) => p.featured);
    if (featured.length > 0) return featured;
    // Fallback final: los más vendidos, para que el popup nunca quede vacío.
    return [...catalog.products]
      .sort((a, b) => (Number(sm[b.id]) || 0) - (Number(sm[a.id]) || 0))
      .slice(0, 8);
  }, [catalog, salesMap]);
  const offers = useMemo(() => {
    if (!catalog) return [];
    return catalog.products.filter((p) => p.offer && p.originalPrice && p.originalPrice > p.priceUSD);
  }, [catalog]);

  // Apertura externa: el campo del TopNav entrega la consulta ya escrita.
  useEffect(() => {
    const open = (e) => {
      const q = e?.detail?.query;
      if (typeof q === "string" && q) setQuery(q);
      setIsOpen(true);
    };
    window.addEventListener("open-search", open);
    return () => window.removeEventListener("open-search", open);
  }, []);

  // Datos del catálogo (solo la primera vez que se abre)
  useEffect(() => {
    if (!isOpen || catalog || loadAttempted.current) return;
    loadAttempted.current = true;
    fetchCatalog().then(setCatalog);
  }, [isOpen, catalog]);

  useEffect(() => {
    if (isOpen) {
      return lockBodyScroll();
    }
  }, [isOpen]);

  const close = () => setIsOpen(false);

  // Mientras el ProductModal está abierto sobre el drawer, el drawer "cede":
  // se oculta y vuelve a abrirse al cerrar la ficha (mantiene el contexto).
  useHistoryPopup(isOpen && !selectedProduct, close);
  const drawerRef = useFocusTrap(isOpen && !selectedProduct);

  const handleOpenProduct = (product) => {
    setIsOpen(false);
    setSelectedProduct(product);
  };

  const handleCloseProduct = () => {
    setSelectedProduct(null);
    setIsOpen(true);
  };

  return (
    <>
      <div className={`cart-overlay ${isOpen && !selectedProduct ? "open" : ""}`} onClick={close} />

      <div className={`cart-drawer search-drawer ${isOpen && !selectedProduct ? "open" : ""}`} ref={drawerRef} role="dialog" aria-modal="true" aria-label="Buscar en elBisne">
        <div className="cart-header">
          <h2>Buscar</h2>
          <button className="modal-close" onClick={close} aria-label="Cerrar buscador">
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="cart-items-container search-drawer-body">
          {catalog ? (
            <GlobalSearch
              compact
              showDiscovery
              trends={trends}
              offers={offers}
              products={catalog.products}
              bisnes={catalog.bisnes}
              value={query}
              onChange={setQuery}
              onOpenProduct={handleOpenProduct}
              onClear={() => setQuery("")}
            />
          ) : (
            <div className="panel-skeleton" aria-busy="true">
              <div className="perfil-skeleton-line" style={{ width: "100%" }} />
              <div className="perfil-skeleton-line" style={{ width: "80%" }} />
              <div className="perfil-skeleton-line" style={{ width: "60%" }} />
            </div>
          )}
        </div>
      </div>

      <ProductModal
        product={withStock(selectedProduct)}
        onClose={handleCloseProduct}
        onAddToCart={addToCart}
        storeConfig={storeConfig}
        onOrderComplete={handleOrderComplete}
        isFavorited={selectedProduct ? favoriteIds.includes(selectedProduct.id) : false}
        onToggleFavorite={toggleFavorite}
      />
    </>
  );
}
