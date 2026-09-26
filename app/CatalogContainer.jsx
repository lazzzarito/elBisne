"use client";

import { useState, useEffect, useRef, useMemo, useCallback, startTransition } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import FilterHeader from "@/components/FilterHeader";
import MasonryGrid from "@/components/MasonryGrid";
import ProductCard from "@/components/ProductCard";
import Icon from "@/components/Icon";
import StoreInfoCard from "@/components/StoreInfoCard";
import { useApp } from "@/context/AppContext";
import { initPopupHistory } from "@/lib/popup-history";
import { getChannelUrl, getDefaultChannel } from "@/lib/messaging";
import { useBisneInfo } from "@/lib/use-bisne-info";
import { searchItems } from "@/lib/search";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { mapProductRow } from "@/lib/catalog";
import { getCollectionsByBisne } from "@/lib/collections";
import StoreHero from "@/components/profile/StoreHero";
import CollectionsSection from "@/components/profile/CollectionsSection";
import CollectionView from "@/components/profile/CollectionView";
import BannersEditor from "@/components/profile/editors/BannersEditor";
import CollectionsEditor from "@/components/profile/editors/CollectionsEditor";
import StoreEditor from "@/components/profile/editors/StoreEditor";
import PublishProductModal from "@/components/profile/PublishProductModal";
import EmptyState from "@/components/ui/EmptyState";
import SectionDivider from "@/components/ui/SectionDivider";
const ProductModal = dynamic(() => import("@/components/ProductModal"), { ssr: false, loading: () => null });
const PromoModal = dynamic(() => import("@/components/PromoModal"), { ssr: false, loading: () => null });
const OfferModal = dynamic(() => import("@/components/OfferModal"), { ssr: false, loading: () => null });
const CustomerInfoModal = dynamic(() => import("@/components/CustomerInfoModal"), { ssr: false, loading: () => null });
const LegalInfoModal = dynamic(() => import("@/components/LegalInfoModal"), { ssr: false, loading: () => null });

export default function CatalogContainer({
  initialProducts,
  storeConfig,
  initialCategory = "all",
  bisneId,
  storeMode = false,
  store = null,
  isOwner = false,
  initialCollections = [],
  beforeFooter = null,
  onOpenStoreMenu = null,
  onStoreDataChanged = null,
}) {
  const {
    isClient,
    addToCart,
    favoriteIds,
    toggleFavorite,
    handleOrderComplete,
    withStock,
    showToast,
  } = useApp();

  const catalogRef = useRef(null);
  const offersRef = useRef(null);
  const [productQtyMap, setProductQtyMap] = useState({});

  // ── Modo tienda: catálogo mutable (dueño edita en vivo) ──
  const [products, setProducts] = useState(initialProducts);
  const [collections, setCollections] = useState(initialCollections);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [activeEditor, setActiveEditor] = useState(null); // null | "store" | "banners" | "collections"
  const [showPublish, setShowPublish] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categoriesList, setCategoriesList] = useState([]);
  const productList = storeMode ? products : initialProducts;

  const loadProductsRaw = useCallback(async (id) => {
    const targetId = id || bisneId;
    if (!targetId || !isSupabaseConfigured()) return [];
    try {
      const todayIso = new Date().toISOString();
      const { data, error } = await createClient()
        .from("products")
        .select("*, categories!products_category_id_fkey(name), bisnes(handle)")
        .eq("bisne_id", targetId)
        .or(`expires_at.is.null,expires_at.gt.${todayIso}`)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const mapped = (data || []).map(mapProductRow);
      mapped.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return a.name.localeCompare(b.name);
      });
      return mapped;
    } catch (e) {
      console.error("Error recargando productos:", e);
      return [];
    }
  }, [bisneId]);

  const loadCollectionsRaw = useCallback(async (id) => {
    const targetId = id || bisneId;
    if (!targetId) return [];
    return getCollectionsByBisne(targetId);
  }, [bisneId]);

  const reloadProducts = useCallback(async (id) => {
    setProducts(await loadProductsRaw(id));
  }, [loadProductsRaw]);

  const reloadCollections = useCallback(async (id) => {
    setCollections(await loadCollectionsRaw(id));
  }, [loadCollectionsRaw]);

  useEffect(() => {
    if (!storeMode) return;
    let active = true;
    Promise.all([loadProductsRaw(), loadCollectionsRaw()]).then(([prods, cols]) => {
      if (!active) return;
      setProducts(prods);
      setCollections(cols);
    });
    return () => { active = false; };
  }, [storeMode, loadProductsRaw, loadCollectionsRaw]);

  useEffect(() => {
    if (!storeMode || !isOwner) return;
    let active = true;
    createClient()
      .from("categories")
      .select("id, name, slug, group_name")
      .order("group_name")
      .order("name")
      .then(({ data }) => {
        if (active) setCategoriesList(data || []);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [storeMode, isOwner]);

  useEffect(() => {
    if (!storeMode) return;
    const handler = () => setShowPublish(true);
    window.addEventListener("open-publish-product", handler);
    return () => window.removeEventListener("open-publish-product", handler);
  }, [storeMode]);

  const clearProductQty = useCallback((productId) => {
    setProductQtyMap((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  useEffect(() => {
    const cleanup = initPopupHistory(() => showToast("Pulsa atrás de nuevo para salir", "warning"));
    return cleanup;
  }, [showToast]);

  // ── Category, search & sort state ──
  const categories = useMemo(() => {
    const seen = new Set();
    productList.forEach((p) => (p.categories && p.categories.length ? p.categories : [p.category]).forEach((c) => c && seen.add(c)));
    return Array.from(seen);
  }, [productList]);

  const scrollInProgressRef = useRef(false);
  const [activeCategory, setActiveCategory] = useState(
    initialCategory && categories.includes(initialCategory) ? initialCategory : "all"
  );
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
    // Búsqueda tolerante (lib/search): sin tildes, plurales, tipeos y
    // sinónimos/regionalismos ("mobiles"/"celular" ↔ "móvil").
    const cleanQuery = searchQuery.trim();
    const searchIdx = cleanQuery
      ? searchItems(productList, cleanQuery, (p) => [p.name, p.category, ...(p.categories || []), p.description || "", p.promo || ""])
          .reduce((m, r) => { m.set(r.item.id, r.score); return m; }, new Map())
      : null;

    const filtered = productList.filter((product) => {
      const matchesCategory =
        activeCategory === "all" ||
        (product.categories && product.categories.length > 0
          ? product.categories.includes(activeCategory)
          : product.category === activeCategory);
      if (!searchIdx) return matchesCategory;
      return matchesCategory && searchIdx.has(product.id);
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
  }, [productList, activeCategory, searchQuery, sortBy]);

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
    return productList.filter((p) => p.offer && p.originalPrice && p.originalPrice > p.priceUSD);
  }, [productList]);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [showOffers, setShowOffers] = useState(false);

  const footerRef = useRef(null);

  // El carrito vive en el layout: reportamos la visibilidad del footer para
  // que su FAB mutar a "volver arriba" cuando este footer está a la vista.
  useEffect(() => {
    if (!isClient) return;
    const el = footerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        window.dispatchEvent(new CustomEvent("cart-footer-visibility", { detail: { visible: entry.isIntersecting } }));
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.dispatchEvent(new CustomEvent("cart-footer-visibility", { detail: { visible: false } }));
    };
  }, [isClient]);

  const handleAddToCart = useCallback((product, selectedOptions = null, qty = 1) => {
    addToCart(product, selectedOptions, qty);
    clearProductQty(product.id);
  }, [addToCart, clearProductQty]);

  const productQty = selectedProduct ? (productQtyMap[selectedProduct.id] ?? 1) : 1;

  const handleQtyChange = useCallback((qty) => {
    if (selectedProduct) {
      setProductQtyMap((prev) => ({ ...prev, [selectedProduct.id]: qty }));
    }
  }, [selectedProduct]);

  const handlePromoClick = useCallback((index) => {
    const links = storeConfig.promoLinks || [];
    const link = links[index];
    if (!link) return;
    if (link.type === "promo") {
      const banners = storeConfig.promoBanners || [];
      const image = banners[index] || null;
      setSelectedPromo({ ...link, image });
    } else if (link.type === "product") {
      const product = productList.find((p) => p.id === link.target);
      if (product) setSelectedProduct(product);
    }
  }, [storeConfig, productList]);

  const visibleProducts = sortedProducts.slice(0, visibleLimit);

  // Bisne dueño del producto abierto en el modal (para el header del modal)
  const selectedBisneInfo = useBisneInfo(selectedProduct?.bisneId || bisneId);

  const promoProducts = useMemo(() => {
    if (!selectedPromo) return [];
    return productList.filter((p) => p.promo === selectedPromo.target);
  }, [selectedPromo, productList]);

  // ── Modo tienda: contacto, banners y colecciones para hero/sección ──
  const storeContactHref = useMemo(() => {
    if (!storeMode || !store) return null;
    return getChannelUrl(
      "whatsapp",
      {
        messaging: { channels: { whatsapp: { enabled: true, number: store.phoneWhatsapp } } },
        whatsappNumber: store.phoneWhatsapp,
      },
      `¡Hola ${store.business_name}! Te encontré en elBisne.`
    );
  }, [storeMode, store]);

  const storeBanners = (storeMode && store?.banners ? store.banners : [])
    .filter((b) => b && b.image_url)
    .slice(0, 5);

  const storeMapsHref = useMemo(() => {
    if (!store) return "";
    const q = store.address || store.business_name || "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }, [store]);

  const pinnedCollections = useMemo(() => {
    if (!storeMode) return [];
    if (collections.length <= 2) return collections.slice(0, 2);
    return collections.filter((c) => c.pinned).slice(0, 2);
  }, [storeMode, collections]);

  const sectionCollections = useMemo(() => {
    if (!storeMode) return [];
    const pinnedIds = new Set(pinnedCollections.map((c) => c.id));
    const rest = collections.filter((c) => !pinnedIds.has(c.id));
    return rest.length > 2 ? rest : [];
  }, [storeMode, collections, pinnedCollections]);

  const handleOpenBanner = useCallback(
    (b) => {
      if (!storeMode) return;
      if (b.link_type === "collection") {
        const c = collections.find((x) => x.id === b.target_id);
        if (c) setSelectedCollection(c);
      } else {
        const p = productList.find((x) => x.id === b.target_id || (x.dbId && x.dbId === b.target_id));
        if (p) setSelectedProduct(p);
      }
    },
    [storeMode, collections, productList]
  );

  const handleProductSaved = useCallback(
    (id, wasEditing) => {
      reloadProducts();
      reloadCollections();
      if (id && storeMode && wasEditing) setEditingProduct(null);
    },
    [reloadProducts, reloadCollections, storeMode]
  );

  const handleProductDeleted = useCallback(
    (id) => {
      reloadProducts();
      reloadCollections();
      if (storeMode) setEditingProduct(null);
    },
    [reloadProducts, reloadCollections, storeMode]
  );

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
        productCount={sortedProducts.length}
        totalCount={productList.length}
        storeMode={storeMode}
        store={store}
        isOwner={isOwner}
        onOpenStoreMenu={onOpenStoreMenu}
        onEditSection={() => setActiveEditor("store")}
        storeContactHref={storeContactHref}
      />

      {/* ── Main content: promos, offers, product grid ── */}
      <main className="main-container" id="main-content">
        {storeMode ? (
          <StoreHero
            banners={storeBanners}
            pinnedCollections={pinnedCollections}
            isOwner={isOwner}
            onOpenBanner={handleOpenBanner}
            onOpenCollection={setSelectedCollection}
            onEditHero={() => setActiveEditor("banners")}
          />
        ) : promoBanners[0] && (
          <div className="promo-grid">
            <div className="promo-grid-landscape" onClick={() => handlePromoClick(0)} style={{ cursor: "pointer" }}>
              <Image src={promoBanners[0]} alt={storeConfig.promoLinks?.[0]?.title || "Promoción"} fill className="promo-grid-img" sizes="(max-width: 768px) 100vw, 50vw" priority />
            </div>
            <div className="promo-grid-squares">
              {promoBanners[1] && (
                <div className="promo-grid-square" onClick={() => handlePromoClick(1)} style={{ cursor: "pointer" }}>
                  <Image src={promoBanners[1]} alt={storeConfig.promoLinks?.[1]?.title || "Promoción"} fill className="promo-grid-img" sizes="(max-width: 768px) 50vw, 25vw" priority />
                </div>
              )}
              {promoBanners[2] && (
                <div className="promo-grid-square" onClick={() => handlePromoClick(2)} style={{ cursor: "pointer" }}>
                  <Image src={promoBanners[2]} alt={storeConfig.promoLinks?.[2]?.title || "Promoción"} fill className="promo-grid-img" sizes="(max-width: 768px) 50vw, 25vw" priority />
                </div>
              )}
            </div>
          </div>
        )}

        {offerProducts.length > 0 && !store?.isPersonal && (
          <section className="featured-section" ref={offersRef}>
            <h2 className="featured-title">
              Productos en Oferta
              <button
                className="btn-offers-expand"
                onClick={() => setShowOffers(true)}
                title="Ver todos"
              >
                <Icon name="plus" />
                <span className="btn-expand-label">Ver todas</span>
              </button>
            </h2>
            <MasonryGrid key="offers">
              {offerProducts.slice(0, 8).map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={withStock(product)}
                  onAddToCart={handleAddToCart}
                  onOpenDetails={setSelectedProduct}
                  isFavorited={favoriteIds.includes(product.id)}
                  onToggleFavorite={toggleFavorite}
                  priority
                  index={i}
                  onEditProduct={isOwner ? setEditingProduct : undefined}
                />
              ))}
            </MasonryGrid>
          </section>
        )}

        {sectionCollections.length > 0 && (
          <>
            <SectionDivider />
            <CollectionsSection
              collections={sectionCollections}
              onOpenCollection={setSelectedCollection}
              isOwner={isOwner}
              onEditCollections={() => setActiveEditor("collections")}
            />
          </>
        )}

        <div ref={catalogRef}>
          <h1 className="featured-title">
            Productos Disponibles
            <button
              className="btn-filter-catalog"
              onClick={() => window.dispatchEvent(new CustomEvent("open-sort-menu"))}
              title="Filtros"
            >
              <Icon name="filter" />
              <span className="btn-expand-label">Filtros</span>
            </button>
            {isOwner && (
              <button
                className="btn-offers-expand"
                onClick={() => setShowPublish(true)}
                title="Publicar producto"
              >
                <Icon name="plus" />
                <span className="btn-expand-label">Publicar</span>
              </button>
            )}
          </h1>
          {visibleProducts.length > 0 ? (
            <MasonryGrid key={`${activeCategory}-${searchQuery}-${sortBy}`}>
              {visibleProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={withStock(product)}
                  onAddToCart={handleAddToCart}
                  onOpenDetails={setSelectedProduct}
                  isFavorited={favoriteIds.includes(product.id)}
                  onToggleFavorite={toggleFavorite}
                  priority={i < 4}
                  index={i}
                  onEditProduct={isOwner ? setEditingProduct : undefined}
                />
              ))}
            </MasonryGrid>
          ) : (
            <div className="cart-empty-message" style={{ marginTop: "4rem" }}>
              {storeMode && isOwner ? (
                <EmptyState
                  icon="shopping-bag"
                  title="Aún no has publicado productos"
                  description="Publica tu primer producto para empezar a vender."
                  actionLabel="Publicar producto"
                  onAction={() => setShowPublish(true)}
                />
              ) : (
                <>
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
                </>
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

      <ProductModal
        product={withStock(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        storeConfig={storeConfig}
        onOrderComplete={() => {
          if (selectedProduct) clearProductQty(selectedProduct.id);
          handleOrderComplete();
        }}
        productQty={productQty}
        onQtyChange={handleQtyChange}
        isFavorited={selectedProduct ? favoriteIds.includes(selectedProduct.id) : false}
        onToggleFavorite={toggleFavorite}
        bisneInfo={selectedBisneInfo}
        onEditProduct={isOwner ? setEditingProduct : undefined}
      />

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

      {storeMode && (
        <CollectionView
          collection={selectedCollection}
          onClose={() => setSelectedCollection(null)}
          onOpenProduct={setSelectedProduct}
          isOwner={isOwner}
          onEditCollections={() => setActiveEditor("collections")}
        />
      )}

      {storeMode && isOwner && activeEditor === "banners" && (
        <BannersEditor
          bisneId={bisneId}
          banners={storeBanners}
          collections={collections}
          products={productList}
          onSaved={() => onStoreDataChanged?.()}
          onClose={() => setActiveEditor(null)}
        />
      )}

      {storeMode && isOwner && activeEditor === "collections" && (
        <CollectionsEditor
          bisneId={bisneId}
          collections={collections}
          products={productList}
          onSaved={() => {
            reloadCollections();
            reloadProducts();
          }}
          onClose={() => setActiveEditor(null)}
        />
      )}

      {storeMode && isOwner && activeEditor === "store" && (
        <StoreEditor
          bisneId={bisneId}
          store={store}
          onSaved={() => onStoreDataChanged?.()}
          onClose={() => setActiveEditor(null)}
        />
      )}

      {/* Publicar / editar producto desde el perfil (dueño) */}
      {storeMode && isOwner && showPublish && (
        <PublishProductModal
          bisneId={bisneId}
          product={null}
          categories={categoriesList}
          collections={collections}
          isPersonal={store?.isPersonal}
          onSaved={handleProductSaved}
          onClose={() => setShowPublish(false)}
        />
      )}

      {storeMode && isOwner && editingProduct && (
        <PublishProductModal
          bisneId={bisneId}
          product={editingProduct}
          categories={categoriesList}
          collections={collections}
          isPersonal={store?.isPersonal}
          onSaved={handleProductSaved}
          onDeleted={handleProductDeleted}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {beforeFooter && <SectionDivider />}
      {beforeFooter}

      {/* ── Footer with map & social links ── */}
      <footer className="app-footer-minimal" ref={footerRef}>
        {storeMode && store ? (
          <>
            <div className="footer-store-card">
              <div className="footer-store-header">
                {(store.logoUrl || storeConfig.logoUrl) && (
                  <div className="footer-store-logo">
                    <Image src={store.logoUrl || storeConfig.logoUrl} alt={store.business_name} width={36} height={36} style={{ borderRadius: "50%", objectFit: "cover" }} />
                  </div>
                )}
                <div className="footer-store-header-left">
                  <h3 className="footer-store-name">{store.business_name}</h3>
                  <span className="store-info-badge">
                    {store.verified ? "Tienda verificada" : "Catálogo en línea"}
                  </span>
                </div>
                <div className="social-links">
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
                </div>
                {isOwner && (
                  <button type="button" className="footer-store-edit" onClick={() => setActiveEditor("store")} title="Editar datos de la tienda">
                    <Icon name="edit" size={14} />
                  </button>
                )}
              </div>
              <div className="footer-store-grid">
                <StoreInfoCard storeConfig={storeConfig} hideContact />
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
                    href={storeMapsHref || storeConfig.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeConfig.location || "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-map-btn"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Ver en Google Maps
                  </a>
                </div>
              </div>
              <div className="footer-map-frame">
                <iframe
                  title="Ubicación de la tienda"
                  src={storeConfig.mapEmbedUrl || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3663.5!2d-82.366596!3d23.113592!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88e7bd4a7c4dc92d%3A0x4a5c1b1f35a0e3f1!2sLa%20Habana%2C%20Cuba!5e0!3m2!1ses!2scu!4v1710000000000"}
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
              </div>
            </div>
          </>
        ) : (
          <>
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
                {storeMode && isOwner && (
                  <button type="button" className="footer-store-edit" onClick={() => setActiveEditor("store")} title="Editar datos de la tienda">
                    <Icon name="edit" size={14} />
                  </button>
                )}
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
                    href={storeMapsHref || storeConfig.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeConfig.location || "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-map-btn"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Ver en Google Maps
                  </a>
                </div>
              </div>
              <div className="footer-map-frame">
                <iframe
                  title="Ubicación de la tienda"
                  src={storeConfig.mapEmbedUrl || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3663.5!2d-82.366596!3d23.113592!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88e7bd4a7c4dc92d%3A0x4a5c1b1f35a0e3f1!2sLa%20Habana%2C%20Cuba!5e0!3m2!1ses!2scu!4v1710000000000"}
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
              </div>
            </div>
          </>
        )}
      </footer>
    </>
  );
}