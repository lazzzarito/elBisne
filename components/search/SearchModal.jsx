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
const QuickBuyModal = dynamic(() => import("@/components/QuickBuyModal"), { ssr: false, loading: () => null });

// ── Popup de búsqueda (mismo drawer que el carrito) ──────────────────────
// El icono de buscador del TopNav abre este bottom-sheet con la sección de
// búsqueda que antes vivía en /explorar. Se monta una vez en el layout y
// escucha el evento "open-search" (mismo patrón que el carrito).
export default function SearchModal({ storeConfig }) {
  const { addToCart, withStock, favoriteIds, toggleFavorite, handleOrderComplete } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [catalog, setCatalog] = useState(null); // { products, bisnes } | null = cargando
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quickBuyProduct, setQuickBuyProduct] = useState(null);
  const loadAttempted = useRef(false);

  // Secciones de descubrimiento del popup (estado sin búsqueda):
  //  · Tendencias: productos en campaña promocional (fallback: destacados)
  //  · Ofertas: productos rebajados de verdad (offer + precio original mayor)
  const trends = useMemo(() => {
    if (!catalog) return [];
    const promo = catalog.products.filter((p) => p.promo);
    return promo.length > 0 ? promo : catalog.products.filter((p) => p.featured);
  }, [catalog]);
  const offers = useMemo(() => {
    if (!catalog) return [];
    return catalog.products.filter((p) => p.offer && p.originalPrice && p.originalPrice > p.priceUSD);
  }, [catalog]);

  // Apertura externa desde el icono de búsqueda del TopNav
  useEffect(() => {
    const open = () => setIsOpen(true);
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
  useHistoryPopup(isOpen && !selectedProduct && !quickBuyProduct, close);
  const drawerRef = useFocusTrap(isOpen && !selectedProduct && !quickBuyProduct);

  const handleOpenProduct = (product) => {
    setIsOpen(false);
    setSelectedProduct(product);
  };

  const handleCloseProduct = () => {
    setSelectedProduct(null);
    setQuickBuyProduct(null);
    setIsOpen(true);
  };

  return (
    <>
      <div className={`cart-overlay ${isOpen && !selectedProduct && !quickBuyProduct ? "open" : ""}`} onClick={close} />

      <div className={`cart-drawer search-drawer ${isOpen && !selectedProduct && !quickBuyProduct ? "open" : ""}`} ref={drawerRef} role="dialog" aria-modal="true" aria-label="Buscar en elBisne">
        <div className="cart-header">
          <h2>Buscar</h2>
          <button className="modal-close" onClick={close} aria-label="Cerrar buscador">
            <Icon name="close" size={18} />
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
        onQuickBuy={(p, opts, q) => { setQuickBuyProduct({ ...p, quantity: q }); }}
        isFavorited={selectedProduct ? favoriteIds.includes(selectedProduct.id) : false}
        onToggleFavorite={toggleFavorite}
      />

      {quickBuyProduct && (
        <QuickBuyModal
          product={quickBuyProduct}
          onClose={() => { setQuickBuyProduct(null); setIsOpen(true); }}
          onOrderComplete={() => {
            handleOrderComplete();
            setQuickBuyProduct(null);
            setIsOpen(true);
          }}
          storeConfig={storeConfig}
        />
      )}
    </>
  );
}
