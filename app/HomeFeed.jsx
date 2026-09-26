"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import SitePromoSlider from "@/components/feed/SitePromoSlider";
import OffersSection from "@/components/feed/OffersSection";
import RecommendationsFeed from "@/components/feed/RecommendationsFeed";
import BusinessesNearby from "@/components/feed/BusinessesNearby";
import BusinessesNearLocation from "@/components/feed/BusinessesNearLocation";
import DiscoverFeed from "@/components/feed/DiscoverFeed";
import SiteFooter from "@/components/feed/SiteFooter";
import LegalInfoModal from "@/components/LegalInfoModal";
import HomeSearchView from "@/components/search/HomeSearchView";
import SectionDivider from "@/components/ui/SectionDivider";
import { useApp } from "@/context/AppContext";
import { useBisneInfo } from "@/lib/use-bisne-info";
import { loadBisneIndex } from "@/lib/orders";
import { rankByTrend } from "@/lib/feed-mix";
import { HOME_SEARCH_OPEN, HOME_SEARCH_QUERY, HOME_SEARCH_CLOSE } from "@/lib/search-events";

const ProductModal = dynamic(() => import("@/components/ProductModal"), { ssr: false, loading: () => null });

const MAX_TRENDING = 20; // la sección "en tendencia" es una vista previa; el scroll largo vive en "Descubre"

export default function HomeFeed({ initialProducts, storeConfig, bisnes, sitePromos }) {
  const {
    addToCart,
    favoriteIds,
    toggleFavorite,
    handleOrderComplete,
    withStock,
    salesMap,
  } = useApp();

  const [selectedProduct, setSelectedProduct] = useState(null);
  const selectedBisneInfo = useBisneInfo(selectedProduct?.bisneId);
  const [bisneMap, setBisneMap] = useState(null);

  // ── Vista de búsqueda global (sustituye al modal en la home) ────────────
  // El TopNav dispara estos eventos desde app/layout.jsx; aquí se decide si la
  // página se queda mostrando el feed o se transforma en el buscador.
  const [searchView, setSearchView] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const onOpen = (e) => {
      setSearchView(true);
      const q = e?.detail?.query;
      if (typeof q === "string") setSearchQuery(q);
      // El feed es larguísimo y la vista de búsqueda arranca arriba del todo:
      // sin este reset se hereda el scroll y se aterriza en mitad de la página.
      window.scrollTo(0, 0);
    };
    const onQuery = (e) => {
      const q = e?.detail?.query;
      if (typeof q === "string") setSearchQuery(q);
    };
    const onClose = () => {
      setSearchView(false);
      setSearchQuery("");
    };
    window.addEventListener(HOME_SEARCH_OPEN, onOpen);
    window.addEventListener(HOME_SEARCH_QUERY, onQuery);
    window.addEventListener(HOME_SEARCH_CLOSE, onClose);
    return () => {
      window.removeEventListener(HOME_SEARCH_OPEN, onOpen);
      window.removeEventListener(HOME_SEARCH_QUERY, onQuery);
      window.removeEventListener(HOME_SEARCH_CLOSE, onClose);
      // Al salir de la home (p. ej. al abrir un bisne desde un resultado) el
      // TopNav se queda con el texto escrito y, al volver, el campo mostraría
      // una consulta sin vista de búsqueda detrás.
      window.dispatchEvent(new CustomEvent(HOME_SEARCH_CLOSE));
    };
  }, []);

  // El campo grande de la página escribe: se guarda aquí y se reenvía al
  // TopNav para que su campo pequeño no se quede desincronizado.
  const handleSearchChange = useCallback((q) => {
    setSearchQuery(q);
    window.dispatchEvent(new CustomEvent(HOME_SEARCH_QUERY, { detail: { query: q } }));
  }, []);

  const closeSearch = useCallback(() => {
    setSearchView(false);
    setSearchQuery("");
  }, []);

  // Índice de bisnes para el badge "vendido por" en cards
  useEffect(() => {
    let active = true;
    loadBisneIndex().then((map) => {
      if (active && map.size > 0) setBisneMap(map);
    });
    return () => { active = false; };
  }, []);

  // ── Ofertas: prioriza bisnes seguidos (cold start v1) + resto por rebaja ──
  const offers = useMemo(
    () => initialProducts.filter((p) => p.offer && p.originalPrice && p.originalPrice > p.priceUSD),
    [initialProducts]
  );

  // ── Productos en tendencia (cold start v1, UI_UX.md §7): mismo ranking
  // que usa el feed infinito, pero capado a una vista previa corta. ──
  const recommended = useMemo(
    () => rankByTrend(initialProducts, salesMap).slice(0, MAX_TRENDING),
    [initialProducts, salesMap]
  );

  const handleAddToCart = useCallback((product, selectedOptions = null, qty = 1) => {
    addToCart(product, selectedOptions, qty);
  }, [addToCart]);

  return (
    <>
      {searchView ? (
        /* Buscador global: la home se transforma en lugar de abrir un modal */
        <main className="main-container home-search-main" id="main-content">
          <HomeSearchView
            products={initialProducts}
            bisnes={bisnes}
            salesMap={salesMap}
            value={searchQuery}
            onChange={handleSearchChange}
            onOpenProduct={setSelectedProduct}
            onClose={closeSearch}
          />
        </main>
      ) : (
        <>
          <main className="main-container home-feed" id="main-content">
            {/* 1 · Slider de promos globales del sitio (enlaces directos) */}
            <SitePromoSlider promos={sitePromos} />

            {/* 2 · Bisnes recomendados (máx. 10) — cold start: carrusel general */}
            <BusinessesNearby bisnes={(bisnes || []).slice(0, 10)} />

            <SectionDivider />

            {/* 3 · Productos en oferta (máx. 8) */}
            <OffersSection
              offers={offers}
              onAddToCart={handleAddToCart}
              onOpenDetails={setSelectedProduct}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              showBisne={Boolean(bisneMap)}
              bisneMap={bisneMap}
            />

            <SectionDivider />

            {/* 4 · Productos en tendencia (vista previa, cap 20) */}
            <RecommendationsFeed
              products={recommended}
              onAddToCart={handleAddToCart}
              onOpenDetails={setSelectedProduct}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              showBisne={Boolean(bisneMap)}
              bisneMap={bisneMap}
            />

            <SectionDivider />

            {/* 5 · Bisnes cerca de ti (orden por ubicación real del usuario) */}
            <BusinessesNearLocation bisnes={bisnes} />

            <SectionDivider />

            {/* 6 · Feed tipo red social (productos + bisnes, razón 15:1, sin repetir) */}
            <DiscoverFeed
              products={initialProducts}
              bisnes={bisnes}
              onAddToCart={handleAddToCart}
              onOpenDetails={setSelectedProduct}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              showBisne={Boolean(bisneMap)}
              bisneMap={bisneMap}
            />
          </main>

          {/* 7 · Footer global del sitio (solo Home/Explorar) */}
          <SiteFooter storeConfig={storeConfig} />
        </>
      )}

      <LegalInfoModal storeConfig={storeConfig} />

      <ProductModal
        product={withStock(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        storeConfig={storeConfig}
        onOrderComplete={handleOrderComplete}
        isFavorited={selectedProduct ? favoriteIds.includes(selectedProduct.id) : false}
        onToggleFavorite={toggleFavorite}
        bisneInfo={selectedBisneInfo}
      />
    </>
  );
}
