"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import BannerSlider from "@/components/feed/BannerSlider";
import CategoriesCarousel from "@/components/feed/CategoriesCarousel";
import BusinessesNearby from "@/components/feed/BusinessesNearby";
import OffersSection from "@/components/feed/OffersSection";
import RecommendationsFeed from "@/components/feed/RecommendationsFeed";
import { useApp } from "@/context/AppContext";

const ProductModal = dynamic(() => import("@/components/ProductModal"), { ssr: false, loading: () => null });
const Cart = dynamic(() => import("@/components/Cart"), { ssr: false, loading: () => null });
const QuickBuyModal = dynamic(() => import("@/components/QuickBuyModal"), { ssr: false, loading: () => null });
const PromoModal = dynamic(() => import("@/components/PromoModal"), { ssr: false, loading: () => null });
const OfferModal = dynamic(() => import("@/components/OfferModal"), { ssr: false, loading: () => null });

export default function HomeFeed({ initialProducts, storeConfig, categories, bisnes }) {
  const {
    cartItems,
    addToCart,
    updateQty,
    removeItem,
    clearCart,
    favoriteIds,
    toggleFavorite,
    recordSale,
    toEffectiveProduct,
  } = useApp();

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [quickBuyProduct, setQuickBuyProduct] = useState(null);
  const [showOffers, setShowOffers] = useState(false);

  const banners = (storeConfig.promoBanners || []).map((image, i) => ({
    image,
    title: storeConfig.promoLinks?.[i]?.title || "Promoción",
    subtitle: storeConfig.promoLinks?.[i]?.subtitle || "",
  }));

  const offers = initialProducts.filter((p) => p.offer && p.originalPrice && p.originalPrice > p.priceUSD);

  const handleAddToCart = useCallback((product, selectedOptions = null, qty = 1) => {
    addToCart(product, selectedOptions, qty);
  }, [addToCart]);

  const handlePromoClick = useCallback((index) => {
    const links = storeConfig.promoLinks || [];
    const link = links[index];
    if (!link) return;
    if (link.type === "promo") {
      const image = (storeConfig.promoBanners || [])[index] || null;
      setSelectedPromo({ ...link, image });
    } else if (link.type === "product") {
      const product = initialProducts.find((p) => p.id === link.target);
      if (product) setSelectedProduct(product);
    }
  }, [storeConfig, initialProducts]);

  const promoProducts = initialProducts.filter((p) => selectedPromo && p.promo === selectedPromo.target);

  return (
    <>
      <main className="main-container home-feed" id="main-content">
        {banners.length > 0 && <BannerSlider banners={banners} onBannerClick={handlePromoClick} />}

        <CategoriesCarousel
          categories={categories}
          onSelect={() => {}}
        />

        <BusinessesNearby bisnes={bisnes} />

        <OffersSection
          offers={offers}
          onAddToCart={handleAddToCart}
          onOpenDetails={setSelectedProduct}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
          onSeeAll={() => setShowOffers(true)}
        />

        <RecommendationsFeed
          products={initialProducts}
          onAddToCart={handleAddToCart}
          onOpenDetails={setSelectedProduct}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
        />
      </main>

      <Cart
        cartItems={cartItems}
        onUpdateQty={updateQty}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
        storeConfig={storeConfig}
        onOrderComplete={() => {
          cartItems.forEach((item) => recordSale(item.productId || item.id, item.quantity));
        }}
        onEditItem={(item) => {
          const originalProduct = initialProducts.find(p => p.id === (item.productId || item.id.split("::")[0]));
          if (originalProduct) setSelectedProduct(originalProduct);
        }}
      />

      <ProductModal
        product={toEffectiveProduct(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
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
            if (quickBuyProduct?.id) recordSale(quickBuyProduct.id, quickBuyProduct.quantity || 1);
            setSelectedProduct(null);
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

      {showOffers && (
        <OfferModal
          products={offers}
          onClose={() => setShowOffers(false)}
          onAddToCart={handleAddToCart}
          onOpenDetails={setSelectedProduct}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </>
  );
}