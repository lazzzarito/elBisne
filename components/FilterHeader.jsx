"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useHistoryPopup } from "@/lib/use-history-popup";
import { getChannelUrl, getDefaultChannel } from "@/lib/messaging";
import StoreInfoCard from "@/components/StoreInfoCard";


export default function FilterHeader({
  categories,
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  storeConfig,
  favoriteCount = 0,
  onOpenFavorites,
  productCount,
  totalCount,
}) {
  // ── Refs & UI state ──
  const navRef = useRef(null);
  const searchInputRef = useRef(null);
  const sortMenuRef = useRef(null);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [showStoreInfo, setShowStoreInfo] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // ── Auto-scroll active category tab into view ──
  useEffect(() => {
    if (!navRef.current) return;
    const activeTab = navRef.current.querySelector(".category-btn.active");
    if (activeTab) {
      const container = navRef.current;
      const scrollLeft =
        activeTab.offsetLeft - container.offsetWidth / 2 + activeTab.offsetWidth / 2;
      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: "smooth",
      });
    }
  }, [activeCategory]);

  // ── Focus search when mobile search activates ──
  useEffect(() => {
    if (isMobileSearchActive && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isMobileSearchActive]);

  // ── Lock scroll & handle Escape key for modals ──
  useEffect(() => {
    if (showStoreInfo) {
      const unlock = lockBodyScroll();
      const handler = (e) => { if (e.key === "Escape") setShowStoreInfo(false); };
      document.addEventListener("keydown", handler);
      return () => {
        document.removeEventListener("keydown", handler);
        unlock();
      };
    }
  }, [showStoreInfo]);

  useEffect(() => {
    if (showSortMenu) {
      const unlock = lockBodyScroll();
      const handler = (e) => { if (e.key === "Escape") setShowSortMenu(false); };
      document.addEventListener("keydown", handler);
      return () => {
        document.removeEventListener("keydown", handler);
        unlock();
      };
    }
  }, [showSortMenu]);

  useHistoryPopup(showStoreInfo, () => setShowStoreInfo(false));
  useHistoryPopup(showSortMenu, () => setShowSortMenu(false));

  // ── Listen for "open-store-info" custom event from footer ──
  useEffect(() => {
    const handler = () => setShowStoreInfo(true);
    window.addEventListener("open-store-info", handler);
    return () => window.removeEventListener("open-store-info", handler);
  }, []);

  // ── Listen for "open-sort-menu" custom event from catalog ──
  useEffect(() => {
    const handler = () => setShowSortMenu(true);
    window.addEventListener("open-sort-menu", handler);
    return () => window.removeEventListener("open-sort-menu", handler);
  }, []);

  const getChannelHref = (msg) => {
    const ch = typeof window !== "undefined" ? (localStorage.getItem("elbisne_channel") || getDefaultChannel(storeConfig)) : getDefaultChannel(storeConfig);
    return getChannelUrl(ch, storeConfig, msg);
  };

  return (
    <>
      {/* ── Header bar: mobile search or brand + categories + actions ── */}
      <header className="app-header">
        {isMobileSearchActive ? (
          <div className="mobile-search-row">
            <button
              className="btn-back-header"
              onClick={() => {
                setIsMobileSearchActive(false);
                onSearchChange("");
              }}
              title="Atrás"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <div className="search-bar-wrapper" style={{ maxWidth: "none", flex: 1 }}>
              <span className="search-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="Buscar productos..."
                aria-label="Buscar productos"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search-btn" onClick={() => onSearchChange("")} title="Limpiar" aria-label="Limpiar búsqueda">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="header-main-row">
            <div className="brand-section" style={{ cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              <div className="brand-logo-container">
                <Image
                  src={storeConfig.logoUrl || "/logo.webp"}
                  alt={storeConfig.name}
                  width={36}
                  height={36}
                  className="brand-logo-image"
                  priority
                />
              </div>
            </div>

            <div className="category-nav-container" ref={navRef}>
              <nav className="category-nav">
                <button
                  className={`category-btn ${activeCategory === "all" ? "active" : ""}`}
                  onClick={() => onCategoryChange("all")}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`category-btn ${activeCategory === category ? "active" : ""}`}
                    onClick={() => onCategoryChange(category)}
                  >
                    {category}
                  </button>
                ))}
              </nav>
            </div>

            <div className="header-right-actions">
              <div className="desktop-search-bar">
                <div className="search-bar-wrapper">
                  <span className="search-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </span>
                    <input
                    type="text"
                    className="search-input"
                    placeholder="Buscar..."
                    aria-label="Buscar productos"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                  />
                  {searchQuery && (
<button className="clear-search-btn" onClick={() => onSearchChange("")} title="Limpiar" aria-label="Limpiar búsqueda">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <button
                className="icon-btn mobile-only-btn"
                onClick={() => setIsMobileSearchActive(true)}
                title="Buscar..."
                aria-label="Buscar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>

              <button
                className="icon-btn"
                onClick={onOpenFavorites}
                title="Favoritos"
                aria-label="Favoritos"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span className={`fav-badge-header${favoriteCount > 0 ? "" : " empty"}`} suppressHydrationWarning>{favoriteCount}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Sort / filter bottom sheet ── */}
      {showSortMenu && (
        <div className="sort-modal-overlay" onClick={() => setShowSortMenu(false)}>
          <div className="sort-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sort-modal-header">
              <button className="modal-close" onClick={() => setShowSortMenu(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              <div className="store-info-header">
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <h2 className="store-info-title">Filtros</h2>
                  <span className="store-info-badge">
                    {productCount !== undefined && totalCount !== undefined
                      ? `${productCount} de ${totalCount} productos`
                      : "Ajusta tu búsqueda"}
                  </span>
                </div>
              </div>
            </div>

            <div className="sort-modal-scroll">
              <div className="store-info-body">
              <div className="store-info-section">
                <strong>Categorías</strong>
                <div className="sort-modal-categories-scroll">
                  <button
                    className={`sort-category-pill ${activeCategory === "all" ? "active" : ""}`}
                    onClick={() => onCategoryChange("all")}
                  >
                    Todas
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      className={`sort-category-pill ${activeCategory === category ? "active" : ""}`}
                      onClick={() => onCategoryChange(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="store-info-section">
                <strong>Ordenar por</strong>
                <div className="sort-modal-options">
                  <button
                    type="button"
                    className={`sort-dropdown-option ${sortBy === "featured" ? "active" : ""}`}
                    onClick={() => onSortChange("featured")}
                  >
                    Destacados primero
                  </button>
                  <button
                    type="button"
                    className={`sort-dropdown-option ${sortBy === "price-asc" ? "active" : ""}`}
                    onClick={() => onSortChange("price-asc")}
                  >
                    Precio: menor a mayor
                  </button>
                  <button
                    type="button"
                    className={`sort-dropdown-option ${sortBy === "price-desc" ? "active" : ""}`}
                    onClick={() => onSortChange("price-desc")}
                  >
                    Precio: mayor a menor
                  </button>
                  <button
                    type="button"
                    className={`sort-dropdown-option ${sortBy === "name-asc" ? "active" : ""}`}
                    onClick={() => onSortChange("name-asc")}
                  >
                    Nombre: A-Z
                  </button>
                  <button
                    type="button"
                    className={`sort-dropdown-option ${sortBy === "name-desc" ? "active" : ""}`}
                    onClick={() => onSortChange("name-desc")}
                  >
                    Nombre: Z-A
                  </button>
                </div>
              </div>

              {(activeCategory !== "all" || sortBy !== "featured") && (
                <button
                  className="btn-clear-filters"
                  onClick={() => {
                    onCategoryChange("all");
                    onSortChange("featured");
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  Limpiar filtros
                </button>
              )}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Store info modal ── */}
      {showStoreInfo && (
        <div className="store-info-overlay" onClick={() => setShowStoreInfo(false)}>
          <div className="store-info-modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "80dvh" }}>
             <button className="modal-close" onClick={() => setShowStoreInfo(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <div className="store-info-scroll">
              <div className="store-info-header">
                {storeConfig.logoUrl && (
                  <Image src={storeConfig.logoUrl} alt={storeConfig.name} width={36} height={36} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <h2 className="store-info-title">{storeConfig.name}</h2>
                  <span className="store-info-badge">Catálogo en línea</span>
                </div>
              </div>

              <div className="store-info-body">
                <StoreInfoCard storeConfig={storeConfig} showHowToBuy onOpenLegal={() => window.dispatchEvent(new CustomEvent("open-legal-modal"))} />
              </div>

              <div className="store-info-social">
                <a
                  href="https://github.com/lazzzarito/elBisne"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon-btn"
                  title="GitHub"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                </a>
                <a
                  href={getChannelHref("")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon-btn"
                  title="Contactar"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                  </svg>
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon-btn"
                  title="Facebook"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a6 6 0 0 0-6 6v3H9v4h3v8h4v-8h3l1-4h-4V8a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon-btn"
                  title="Instagram"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <circle cx="17.5" cy="6.5" r="1.5"></circle>
                  </svg>
                </a>
              </div>

              <a
                className="store-info-wa-btn"
                href={getChannelHref("¡Hola! Quiero ponerme en contacto")}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                Contáctanos
              </a>

              <button className="store-info-legal-btn" onClick={() => window.dispatchEvent(new CustomEvent("open-legal-modal"))}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                Info legal — Cookies, Privacidad y Términos
              </button>

              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "center", marginTop: "1.5rem" }}>
                Made with <span style={{ color: "#e74c3c" }}>❤️‍🔥</span> by{" "}
                <a href="https://1azarito.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-green)", textDecoration: "none", fontWeight: 600 }}>1azarito</a>
              </p>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
