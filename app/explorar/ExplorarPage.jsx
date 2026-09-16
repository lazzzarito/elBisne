"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import MasonryGrid from "@/components/MasonryGrid";
import ProductCard from "@/components/ProductCard";
import GlobalSearch from "./GlobalSearch";
import ExploreFilters from "./ExploreFilters";
import TrendsSection from "./TrendsSection";
import MapSection from "./MapSection";
import { useApp } from "@/context/AppContext";

const ProductModal = dynamic(() => import("@/components/ProductModal"), { ssr: false, loading: () => null });
const Cart = dynamic(() => import("@/components/Cart"), { ssr: false, loading: () => null });
const QuickBuyModal = dynamic(() => import("@/components/QuickBuyModal"), { ssr: false, loading: () => null });
const PromoModal = dynamic(() => import("@/components/PromoModal"), { ssr: false, loading: () => null });

export default function ExplorarPage({ initialProducts, storeConfig, categories, bisnes }) {
  const {
    cartItems,
    addToCart,
    updateQty,
    removeItem,
    clearCart,
    favoriteIds,
    toggleFavorite,
    recordSale,
    soldMap,
    toEffectiveProduct,
  } = useApp();

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [maxPrice, setMaxPrice] = useState(0);
  const [offersOnly, setOffersOnly] = useState(false);
  const [sortBy, setSortBy] = useState("featured");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [quickBuyProduct, setQuickBuyProduct] = useState(null);

  const hasFilters = Boolean(query.trim()) || activeCategory !== "all" || maxPrice > 0 || offersOnly;

  const handleAddToCart = useCallback((product, selectedOptions = null, qty = 1) => {
    addToCart(product, selectedOptions, qty);
  }, [addToCart]);

  const visibleProducts = useMemo(() => {
    const clean = query.trim().toLowerCase();
    const filtered = initialProducts.filter((p) => {
      if (activeCategory !== "all" && p.category !== activeCategory) return false;
      if (offersOnly && !(p.offer && p.originalPrice && p.originalPrice > p.priceUSD)) return false;
      if (maxPrice > 0 && p.priceUSD > maxPrice) return false;
      if (clean) {
        const haystack = `${p.name} ${p.category} ${p.description || ""} ${p.promo || ""}`.toLowerCase();
        if (!haystack.includes(clean)) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "price-asc") return a.priceUSD - b.priceUSD;
      if (sortBy === "price-desc") return b.priceUSD - a.priceUSD;
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [initialProducts, query, activeCategory, maxPrice, offersOnly, sortBy]);

  const promoProducts = useMemo(() => {
    if (!selectedPromo) return [];
    return initialProducts.filter((p) => p.promo === selectedPromo.target);
  }, [initialProducts, selectedPromo]);

  const allCategories = useMemo(() => {
    return Array.from(new Set(initialProducts.map((p) => p.category)));
  }, [initialProducts]);

  return (
    <>
      <main className="main-container explore-container" id="main-content">
        <GlobalSearch
          products={initialProducts}
          bisnes={bisnes}
          value={query}
          onChange={setQuery}
          onOpenProduct={setSelectedProduct}
          onClear={() => setQuery("")}
        />

        {hasFilters && (
          <ExploreFilters
            categories={allCategories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            maxPrice={maxPrice}
            onMaxPriceChange={setMaxPrice}
            offersOnly={offersOnly}
            onOffersOnlyChange={setOffersOnly}
            sortBy={sortBy}
            onSortChange={setSortBy}
            productCount={visibleProducts.length}
            totalCount={initialProducts.length}
          />
        )}

        {hasFilters ? (
          <section className="explore-results" aria-label="Resultados">
            <div className="explore-results-count">
              {visibleProducts.length} {visibleProducts.length === 1 ? "resultado" : "resultados"}
              {query && <> para &quot;{query}&quot;</>}
            </div>
            {visibleProducts.length > 0 ? (
              <MasonryGrid key={`explore-${activeCategory}-${sortBy}`}>
                {visibleProducts.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    onOpenDetails={setSelectedProduct}
                    isFavorited={favoriteIds.includes(product.id)}
                    onToggleFavorite={toggleFavorite}
                    priority={i < 4}
                  />
                ))}
              </MasonryGrid>
            ) : (
              <div className="explore-empty">
                <p>No encontramos resultados para tu búsqueda.</p>
                <button type="button" className="btn-outline" onClick={() => { setQuery(""); setActiveCategory("all"); setMaxPrice(0); setOffersOnly(false); }}>
                  Limpiar búsqueda
                </button>
              </div>
            )}
          </section>
        ) : (
          <TrendsSection
            products={initialProducts}
            storeConfig={storeConfig}
            soldMap={soldMap}
            onOpenProduct={setSelectedProduct}
            onOpenPromo={setSelectedPromo}
            onAddToCart={handleAddToCart}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
          />
        )}

        <MapSection bisnes={bisnes} storeConfig={storeConfig} />
      </main>

      <Cart
        cartItems={cartItems}
        onUpdateQty={updateQty}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
        storeConfig={storeConfig}
        onOrderComplete={() => {
          cartItems.forEach((item) => recordSale(item.productId || item.id.split("::")[0], item.quantity));
        }}
        onEditItem={(item) => {
          const originalProduct = initialProducts.find((p) => p.id === (item.productId || item.id.split("::")[0]));
          if (originalProduct) setSelectedProduct(originalProduct);
        }}
      />

      <ProductModal
        product={toEffectiveProduct(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        storeConfig={storeConfig}
        onQuickBuy={(p, opts, q) => { setQuickBuyProduct({ ...p, quantity: q }); }}
        isFavorited={selectedProduct ? favoriteIds.includes(selectedProduct.id) : false}
        onToggleFavorite={toggleFavorite}
      />

      {quickBuyProduct && (
        <QuickBuyModal
          product={quickBuyProduct}
          onClose={() => setQuickBuyProduct(null)}
          onOrderComplete={() => {
            if (quickBuyProduct?.id) recordSale(quickBuyProduct.id, quickBuyProduct.quantity);
            setQuickBuyProduct(null);
          }}
          storeConfig={storeConfig}
        />
      )}

      <PromoModal
        promo={selectedPromo}
        products={promoProducts}
        onClose={() => setSelectedPromo(null)}
        onAddToCart={handleAddToCart}
        onOpenDetails={setSelectedProduct}
        favoriteIds={favoriteIds}
        onToggleFavorite={toggleFavorite}
      />
    </>
  );
}