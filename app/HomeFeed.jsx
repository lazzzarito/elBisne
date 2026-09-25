"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import SitePromoSlider from "@/components/feed/SitePromoSlider";
import OffersSection from "@/components/feed/OffersSection";
import RecommendationsFeed from "@/components/feed/RecommendationsFeed";
import BusinessesNearby from "@/components/feed/BusinessesNearby";
import BusinessesNearLocation from "@/components/feed/BusinessesNearLocation";
import SiteFooter from "@/components/feed/SiteFooter";
import LegalInfoModal from "@/components/LegalInfoModal";
import { useApp } from "@/context/AppContext";
import { useBisneInfo } from "@/lib/use-bisne-info";
import { loadBisneIndex } from "@/lib/orders";

const ProductModal = dynamic(() => import("@/components/ProductModal"), { ssr: false, loading: () => null });

const MAX_RECOMMENDED = 20; // cap para que el infinite scroll viva aquí sin infinito absurdo

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

  // ── Productos recomendados (cold start v1, UI_UX.md §7):
  // popularidad (ventas reales) + ofertas + novedad, mezclados. ──
  const recommended = useMemo(() => {
    const sales = salesMap || {};
    return [...initialProducts]
      .map((p) => {
        // Puntuación: ventas (peso fuerte) + oferta + refresco por novedad
        const sold = Number(sales[p.id]) || 0;
        const offerBoost = p.offer && p.originalPrice && p.originalPrice > p.priceUSD ? 3 : 0;
        return { p, sold, offerBoost };
      })
      .sort((a, b) => b.sold - a.sold || b.offerBoost - a.offerBoost)
      .map(({ p }) => p)
      .slice(0, MAX_RECOMMENDED);
  }, [initialProducts, salesMap]);

  const handleAddToCart = useCallback((product, selectedOptions = null, qty = 1) => {
    addToCart(product, selectedOptions, qty);
  }, [addToCart]);

  return (
    <>
      <main className="main-container home-feed" id="main-content">
        {/* 1 · Slider de promos globales del sitio (enlaces directos) */}
        <SitePromoSlider promos={sitePromos} />

        {/* 2 · Bisnes recomendados (máx. 10) — cold start: carrusel general */}
        <BusinessesNearby bisnes={(bisnes || []).slice(0, 10)} />

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

        {/* 4 · Productos recomendados (cap 20, infinite scroll) */}
        <RecommendationsFeed
          products={recommended}
          onAddToCart={handleAddToCart}
          onOpenDetails={setSelectedProduct}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
          showBisne={Boolean(bisneMap)}
          bisneMap={bisneMap}
        />

        {/* 6 · Bisnes cerca de ti (orden por ubicación real del usuario) */}
        <BusinessesNearLocation bisnes={bisnes} />

      </main>

      {/* 8 · Footer global del sitio (solo Home/Explorar) */}
      <SiteFooter storeConfig={storeConfig} />
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
