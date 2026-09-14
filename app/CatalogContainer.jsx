"use client";

import { useState, useEffect, useRef, useMemo, useCallback, startTransition } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import FilterHeader from "@/components/FilterHeader";
import MasonryGrid from "@/components/MasonryGrid";
import ProductCard from "@/components/ProductCard";
import Icon from "@/components/Icon";
import StoreInfoCard, { StoreInfoItem } from "@/components/StoreInfoCard";
import { initPopupHistory } from "@/lib/popup-history";
import { getChannelUrl, getDefaultChannel } from "@/lib/messaging";
const ProductModal = dynamic(() => import("@/components/ProductModal"), { ssr: false, loading: () => null });
const Cart = dynamic(() => import("@/components/Cart"), { ssr: false, loading: () => null });
const QuickBuyModal = dynamic(() => import("@/components/QuickBuyModal"), { ssr: false, loading: () => null });
const PromoModal = dynamic(() => import("@/components/PromoModal"), { ssr: false, loading: () => null });
const OfferModal = dynamic(() => import("@/components/OfferModal"), { ssr: false, loading: () => null });
const CustomerInfoModal = dynamic(() => import("@/components/CustomerInfoModal"), { ssr: false, loading: () => null });
const LegalInfoModal = dynamic(() => import("@/components/LegalInfoModal"), { ssr: false, loading: () => null });
const FavoritesModal = dynamic(() => import("@/components/FavoritesModal"), { ssr: false, loading: () => null });

export default function CatalogContainer({ initialProducts, storeConfig }) {
  const [cartItems, setCartItems] = useState([]);
  const [isClient, setIsClient] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState("success");
  const [undoItem, setUndoItem] = useState(null);
  const undoTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const catalogRef = useRef(null);
  const offersRef = useRef(null);
  const persistTimerRef = useRef(null);
  const [productQtyMap, setProductQtyMap] = useState({});
  const [soldMap, setSoldMap] = useState({});

  const persistSold = (map) => {
    try { localStorage.setItem("elbisne_sold", JSON.stringify(map)); } catch (e) {}
  };

  const recordSale = useCallback((productId, qty) => {
    setSoldMap((prev) => {
      const next = { ...prev };
      next[productId] = (next[productId] || 0) + qty;
      persistSold(next);
      return next;
    });
  }, []);

  const toEffectiveProduct = useCallback((product) => {
    if (!product) return product;
    const sold = soldMap[product.id] || 0;
    const baseStock = product.stock === undefined || product.stock === null ? Infinity : product.stock;
    const effectiveStock = Math.max(0, baseStock - sold);
    return { ...product, stock: effectiveStock };
  }, [soldMap]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // ── Cart persistence (debounced) ──
  const saveCart = (items) => {
    setCartItems(items);
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      localStorage.setItem("elbisne_cart", JSON.stringify(items));
      persistTimerRef.current = null;
    }, 300);
  };

  const persistCartImmediately = (items) => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    localStorage.setItem("elbisne_cart", JSON.stringify(items));
  };

  const clearCart = useCallback(() => {
    setCartItems([]);
    localStorage.removeItem("elbisne_cart");
  }, []);

  // ── Toast notifications ──
  const showToast = (message, type = "success") => {
    setToast(message);
    setToastType(type);
    window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
    }, 2700);
  };

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const cleanup = initPopupHistory(() => showToast("Press back again to exit", "warning"));
    return cleanup;
  }, []);

  useEffect(() => {
    return () => {
      window.clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // ── Cart actions ──
  const handleAddToCart = (product, selectedOptions = null, qty = 1) => {
    let cartItemId = product.id;
    let finalPrice = product.priceUSD;
    let finalOriginalPrice = product.originalPrice;

    if (selectedOptions && Object.keys(selectedOptions).length > 0) {
      const optionParts = Object.entries(selectedOptions)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join("-");
      cartItemId = `${product.id}-${optionParts}`;

      if (product.options) {
        Object.entries(selectedOptions).forEach(([optionKey, selectedValName]) => {
          const optGroup = product.options[optionKey];
          if (optGroup) {
            const matchedVal = optGroup.find((o) => o.name === selectedValName);
            if (matchedVal && matchedVal.priceUSD !== undefined) {
              finalPrice = matchedVal.priceUSD;
              finalOriginalPrice = matchedVal.originalPrice !== undefined ? matchedVal.originalPrice : null;
            }
          }
        });
      }
    }

    const existing = cartItems.find((item) => item.id === cartItemId);
    if (existing) {
      saveCart(
        cartItems.map((item) =>
          item.id === cartItemId ? { ...item, quantity: item.quantity + qty } : item
        )
      );
    } else {
      saveCart([
        ...cartItems,
        {
          ...product,
          id: cartItemId,
          productId: product.id,
          priceUSD: finalPrice,
          originalPrice: finalOriginalPrice,
          selectedOptions,
          quantity: qty,
        },
      ]);
    }
    showToast(`Añadido: ${product.name}`);
    clearProductQty(product.id);
  };

  const handleUpdateQty = (id, qty) => {
    if (qty <= 0) {
      handleRemoveItem(id);
    } else {
      saveCart(
        cartItems.map((item) =>
          item.id === id ? { ...item, quantity: qty } : item
        )
      );
      showToast("Cantidad actualizada");
    }
  };

  const handleRemoveItem = (id) => {
    const itemToRemove = cartItems.find((item) => item.id === id);
    saveCart(cartItems.filter((item) => item.id !== id));
    if (itemToRemove) {
      setUndoItem(itemToRemove);
      showToast(`Eliminado: ${itemToRemove.name}`);
      window.clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = window.setTimeout(() => setUndoItem(null), 4000);
    }
  };

  const handleUndoRemove = () => {
    if (!undoItem) return;
    window.clearTimeout(undoTimeoutRef.current);
    setUndoItem(null);
    setToast(null);
    saveCart([...cartItems, undoItem]);
    showToast(`Restored: ${undoItem.name}`);
  };

  // ── Category, search & sort state ──
  const categories = useMemo(() => {
    return Array.from(new Set(initialProducts.map((p) => p.category)));
  }, [initialProducts]);

  const scrollInProgressRef = useRef(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("featured");

  const handleCategoryChange = useCallback((cat) => {
    setActiveCategory(cat);
  }, []);

  const handleSearchChange = useCallback((q) => {
    setSearchQuery(q);
    if (q && !scrollInProgressRef.current) {
      scrollInProgressRef.current = true;
      setTimeout(() => {
        catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        scrollInProgressRef.current = false;
      }, 350);
    }
  }, []);

  // ── Only scroll to catalog when category actually changes ──
  const prevCategoryRef = useRef(activeCategory);
  useEffect(() => {
    if (activeCategory !== prevCategoryRef.current) {
      prevCategoryRef.current = activeCategory;
      if (!scrollInProgressRef.current) {
        scrollInProgressRef.current = true;
        setTimeout(() => {
          catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          scrollInProgressRef.current = false;
        }, 350);
      }
    }
  }, [activeCategory]);

  // ── Filter + sort logic ──
  const sortedProducts = useMemo(() => {
    const filtered = initialProducts.filter((product) => {
      const matchesCategory =
        activeCategory === "all" || product.category === activeCategory;
      const cleanQuery = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !cleanQuery ||
        product.name.toLowerCase().includes(cleanQuery) ||
        product.category.toLowerCase().includes(cleanQuery) ||
        (product.description && product.description.toLowerCase().includes(cleanQuery));
      return matchesCategory && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "featured") {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "price-asc") {
        return a.priceUSD - b.priceUSD;
      }
      if (sortBy === "price-desc") {
        return b.priceUSD - a.priceUSD;
      }
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "name-desc") {
        return b.name.localeCompare(a.name);
      }
      return 0;
    });
  }, [initialProducts, activeCategory, searchQuery, sortBy]);

  // ── Infinite scroll ──
  const initialLoad = 24;
  const [visibleLimit, setVisibleLimit] = useState(initialLoad);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    startTransition(() => {
      setVisibleLimit(initialLoad);
      setHasMore(sortedProducts.length > initialLoad);
    });
  }, [searchQuery, activeCategory, sortBy, sortedProducts.length]);

  const loaderRef = useRef(null);

  // ── IntersectionObserver for load-more trigger ──
  useEffect(() => {
    if (!hasMore || !isClient) return;

    const el = loaderRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !loadingMore) {
          setLoadingMore(true);
          requestAnimationFrame(() => {
            setVisibleLimit((prev) => {
              const nextLimit = prev + 24;
              if (nextLimit >= sortedProducts.length) {
                setHasMore(false);
              }
              return nextLimit;
            });
            setLoadingMore(false);
          });
        }
      },
      { threshold: 0.1 }
    );

    if (el) {
      observer.observe(el);
    }

    return () => {
      if (el) {
        observer.unobserve(el);
      }
    };
  }, [hasMore, loadingMore, sortedProducts.length, isClient]);

  // ── Promo & offer sections ──
  const promoBanners = storeConfig.promoBanners || [];

  const offerProducts = useMemo(() => {
    return initialProducts.filter((p) => p.offer && p.originalPrice && p.originalPrice > p.priceUSD);
  }, [initialProducts]);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [quickBuyProduct, setQuickBuyProduct] = useState(null);
  const [showOffers, setShowOffers] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState([]);

  const toggleFavorite = useCallback((productId) => {
    const isCurrentlyFav = favoriteIds.includes(productId);
    const next = isCurrentlyFav
      ? favoriteIds.filter((id) => id !== productId)
      : [...favoriteIds, productId];
    setFavoriteIds(next);
    try { localStorage.setItem("elbisne_favorites", JSON.stringify(next)); } catch (e) {}
    showToast(isCurrentlyFav ? "Eliminado de favoritos" : "Añadido a favoritos", isCurrentlyFav ? "warning" : "success");
  }, [favoriteIds]);

  // ── Load persisted data from localStorage after hydration (batched) ──
  useEffect(() => {
    try {
      const cart = localStorage.getItem("elbisne_cart");
      if (cart) setCartItems(JSON.parse(cart));
      const sold = localStorage.getItem("elbisne_sold");
      if (sold) setSoldMap(JSON.parse(sold));
      const favs = localStorage.getItem("elbisne_favorites");
      if (favs) setFavoriteIds(JSON.parse(favs));
    } catch (e) { console.error("Error reading localStorage:", e); }
  }, []);

  const footerRef = useRef(null);
  const [isFooterVisible, setIsFooterVisible] = useState(false);

  useEffect(() => {
    if (!isClient) return;
    const el = footerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsFooterVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isClient]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const productQty = selectedProduct ? (productQtyMap[selectedProduct.id] ?? 1) : 1;

  const handleQtyChange = useCallback((qty) => {
    if (selectedProduct) {
      setProductQtyMap((prev) => ({ ...prev, [selectedProduct.id]: qty }));
    }
  }, [selectedProduct]);

  const clearProductQty = useCallback((productId) => {
    setProductQtyMap((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  const handlePromoClick = useCallback((index) => {
    const links = storeConfig.promoLinks || [];
    const link = links[index];
    if (!link) return;
    if (link.type === "promo") {
      const banners = storeConfig.promoBanners || [];
      const image = banners[index] || null;
      setSelectedPromo({ ...link, image });
    } else if (link.type === "product") {
      const product = initialProducts.find((p) => p.id === link.target);
      if (product) setSelectedProduct(product);
    }
  }, [storeConfig, initialProducts]);

  const visibleProducts = sortedProducts.slice(0, visibleLimit);

  const promoProducts = useMemo(() => {
    if (!selectedPromo) return [];
    return initialProducts.filter((p) => p.promo === selectedPromo.target);
  }, [selectedPromo, initialProducts]);

  return (
    <>
      <FilterHeader
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        sortBy={sortBy}
        onSortChange={setSortBy}
        storeConfig={storeConfig}
        favoriteCount={favoriteIds.length}
        onOpenFavorites={() => setShowFavorites(true)}
        productCount={sortedProducts.length}
        totalCount={initialProducts.length}
      />

      {toast && (
        <div className={`toast-notification ${toastType}${undoItem ? " has-undo" : ""}`} role="status">
          <Icon name={toastType === "warning" ? "warning" : "check"} />
          <span>{toast}</span>
          {undoItem && (
            <button className="toast-undo-btn" onClick={handleUndoRemove}>Deshacer</button>
          )}
        </div>
      )}

      {/* ── Main content: promos, offers, product grid ── */}
      <main className="main-container" id="main-content">
        {promoBanners[0] && (
          <div className="promo-grid">
            <div className="promo-grid-landscape" onClick={() => handlePromoClick(0)} style={{ cursor: "pointer" }}>
              <Image src={promoBanners[0]} alt={storeConfig.promoLinks?.[0]?.title || "Promotion"} fill className="promo-grid-img" sizes="(max-width: 768px) 100vw, 50vw" priority />
            </div>
            <div className="promo-grid-squares">
              {promoBanners[1] && (
                <div className="promo-grid-square" onClick={() => handlePromoClick(1)} style={{ cursor: "pointer" }}>
                  <Image src={promoBanners[1]} alt={storeConfig.promoLinks?.[1]?.title || "Promotion"} fill className="promo-grid-img" sizes="(max-width: 768px) 50vw, 25vw" priority />
                </div>
              )}
              {promoBanners[2] && (
                <div className="promo-grid-square" onClick={() => handlePromoClick(2)} style={{ cursor: "pointer" }}>
                  <Image src={promoBanners[2]} alt={storeConfig.promoLinks?.[2]?.title || "Promotion"} fill className="promo-grid-img" sizes="(max-width: 768px) 50vw, 25vw" priority />
                </div>
              )}
            </div>
          </div>
        )}

        {offerProducts.length > 0 && (
          <section className="featured-section" ref={offersRef}>
            <h2 className="featured-title">
              Ofertas Flash
              <span className="featured-title-line" />
              <button
                className="btn-offers-expand"
                onClick={() => setShowOffers(true)}
                title="Ver todas las ofertas"
              >
                <Icon name="plus" />
                <span className="btn-expand-label">Ver todas</span>
              </button>
            </h2>
            <MasonryGrid key="offers">
              {offerProducts.slice(0, 8).map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={toEffectiveProduct(product)}
                  onAddToCart={handleAddToCart}
                  onOpenDetails={setSelectedProduct}
                  isFavorited={favoriteIds.includes(product.id)}
                  onToggleFavorite={toggleFavorite}
                  priority
                  index={i}
                />
              ))}
            </MasonryGrid>
          </section>
        )}

        <div ref={catalogRef}>
          <h1 className="featured-title" style={{ marginTop: offerProducts.length > 0 ? "2.5rem" : 0 }}>
            Productos Disponibles
            <span className="featured-title-line" />
            <button
              className="btn-filter-catalog"
              onClick={() => window.dispatchEvent(new CustomEvent("open-sort-menu"))}
              title="Filtros"
            >
               <Icon name="filter" />
                <span className="btn-expand-label">Filtros</span>
            </button>
          </h1>
          {visibleProducts.length > 0 ? (
            <MasonryGrid key={`${activeCategory}-${searchQuery}-${sortBy}`}>
              {visibleProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={toEffectiveProduct(product)}
                  onAddToCart={handleAddToCart}
                  onOpenDetails={setSelectedProduct}
                  isFavorited={favoriteIds.includes(product.id)}
                  onToggleFavorite={toggleFavorite}
                  priority={i < 4}
                  index={i}
                />
              ))}
            </MasonryGrid>
          ) : (
            <div className="cart-empty-message" style={{ marginTop: "4rem" }}>
              <Icon name="no-results" />
              <h3>No se encontraron productos</h3>
              <p style={{ marginTop: "0.5rem", color: "var(--text-secondary)" }}>
                Prueba con otros términos de búsqueda o cambia de categoría.
              </p>
              {(searchQuery || activeCategory !== "all") && (
                <button
                  className="category-btn active"
                  onClick={() => {
                    setSearchQuery("");
                    handleCategoryChange("all");
                  }}
                  style={{ marginTop: "1.5rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <Icon name="cross" />
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {hasMore && (
          <div ref={loaderRef} className="infinite-scroll-trigger">
            <div className="dot-loader">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}
      </main>

      <Cart
        cartItems={cartItems}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onClearCart={clearCart}
        storeConfig={storeConfig}
        onOrderComplete={() => {
          cartItems.forEach((item) => recordSale(item.productId || item.id, item.quantity));
        }}
        isFooterVisible={isFooterVisible}
        scrollToTop={scrollToTop}
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
        productQty={productQty}
        onQtyChange={handleQtyChange}
        isFavorited={selectedProduct ? favoriteIds.includes(selectedProduct.id) : false}
        onToggleFavorite={toggleFavorite}
      />

      {quickBuyProduct && (
        <QuickBuyModal
          product={quickBuyProduct}
          onClose={() => setQuickBuyProduct(null)}
          onOrderComplete={() => {
            if (quickBuyProduct?.id) {
              recordSale(quickBuyProduct.id, quickBuyProduct.quantity || 1);
              clearProductQty(quickBuyProduct.id);
            }
            setSelectedProduct(null);
          }}
          storeConfig={storeConfig}
          onQtyChange={handleQtyChange}
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
          products={offerProducts}
          onClose={() => setShowOffers(false)}
          onAddToCart={handleAddToCart}
          onOpenDetails={setSelectedProduct}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
        />
      )}

      <CustomerInfoModal storeConfig={storeConfig} />
      <LegalInfoModal storeConfig={storeConfig} />

      {showFavorites && (
        <FavoritesModal
          products={initialProducts}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
          onClose={() => setShowFavorites(false)}
          onAddToCart={handleAddToCart}
          onOpenProduct={setSelectedProduct}
        />
      )}

      {/* ── Footer with map & social links ── */}
      <footer className="app-footer-minimal" ref={footerRef}>
        <div className="footer-store-card">
          <div className="footer-store-header">
            {storeConfig.logoUrl && (
              <div className="footer-store-logo">
                <Image src={storeConfig.logoUrl} alt={storeConfig.name} width={36} height={36} style={{ borderRadius: "50%", objectFit: "cover" }} />
              </div>
            )}
            <div className="footer-store-header-left">
              <h3 className="footer-store-name">{storeConfig.name}</h3>
              <span className="store-info-badge">Catálogo en línea</span>
            </div>
            <div className="social-links">
              <a href="https://github.com/lazzzarito/elBisne" target="_blank" rel="noopener noreferrer" className="social-icon-btn" title="GitHub">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              </a>
              <a href={storeConfig.socialLinks?.instagram || "https://instagram.com"} target="_blank" rel="noopener noreferrer" className="social-icon-btn" title="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a href={storeConfig.socialLinks?.facebook || "https://facebook.com"} target="_blank" rel="noopener noreferrer" className="social-icon-btn" title="Facebook">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
              <a
                href={(() => {
                  const ch = typeof window !== "undefined" ? (localStorage.getItem("elbisne_channel") || getDefaultChannel(storeConfig)) : getDefaultChannel(storeConfig);
                  return getChannelUrl(ch, storeConfig, "");
                })()}
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon-btn"
                title="Contactar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </a>
            </div>
          </div>
          <div className="footer-store-grid">
            <StoreInfoCard storeConfig={storeConfig} onOpenLegal={() => window.dispatchEvent(new CustomEvent("open-legal-modal"))} />
          </div>
        </div>

        <div className="footer-map-card">
            <div className="footer-map-header">
            <h3 className="footer-map-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "0.3rem" }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              ¿Dónde encontrarnos?
            </h3>
            <div className="footer-map-actions">
              <a
                href={storeConfig.trustpilotUrl || "https://www.trustpilot.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-map-btn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                Calificar
              </a>

            </div>
          </div>
          <div className="footer-map-frame">
            <iframe
              title="Ubicación de la tienda"
              src={storeConfig.mapEmbedUrl || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3593.2315394774677!2d-80.19178818465261!3d25.76167978363209!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88d9b4a1b1b1b1b1%3A0x1b1b1b1b1b1b1b1b!2sMiami%2C%20FL%2C%20USA!5e0!3m2!1sen!2sus!4v1710000000000"}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              aria-hidden="false"
              allowFullScreen
            />
          </div>
        </div>

        <div className="footer-bottom-row">
          <div className="app-footer-copyright">
            &copy; {new Date().getFullYear()} elBisne. Todos los derechos reservados.
            <span className="footer-credits-text"> Hecho con <span style={{ color: "#e74c3c" }}>❤️‍🔥</span> por{" "}
            <a href="https://github.com/lazzzarito/elBisne" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-green)", fontWeight: 600, textDecoration: "none" }}>1azarito</a></span>
          </div>

        </div>
      </footer>
    </>
  );
}
