"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";
import ProductCard from "@/components/ProductCard";
import { FollowButton } from "@/components/profile/StoreProfileHeader";

const MAX_PRODUCTS = 6;
const MAX_BISNES = 4;
const STORAGE_KEY = "elbisne_recent_searches";

// Buscador en tiempo real corregido (UI_UX.md §5.1/§5.2):
//  · dropdown renderizado con createPortal (sin solapes, z-index controlado)
//  · alturas fijas por tipo de resultado
//  · los resultados alimentan la sección de resultados en vivo (productos + bisnes)
export default function GlobalSearch({
  products,
  bisnes,
  value,
  onChange,
  onOpenProduct,
  onClear,
  followable = false,
}) {
  const [focused, setFocused] = useState(false);
  const [portalEl, setPortalEl] = useState(null);
  const [boxRect, setBoxRect] = useState(null);
  // ── Búsquedas frecuentes (lazy init desde localStorage) ──
  const [recent, setRecent] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw).slice(0, 8) : [];
    } catch (e) {
      return [];
    }
  });
  const [highlighted, setHighlighted] = useState(-1);
  const rootRef = useRef(null);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  // Portal target (evita SSR mismatch); lazy state update vía rAF
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPortalEl(document.body));
    return () => {
      cancelAnimationFrame(raf);
      setPortalEl(null);
    };
  }, []);

  // Posición del dropdown anclada a la caja del input (recalculada en scroll/resize)
  const updateRect = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    const r = box.getBoundingClientRect();
    setBoxRect({ top: r.bottom + 8, left: r.left, width: r.width, bottomGap: window.innerHeight - r.bottom });
  }, []);

  useEffect(() => {
    if (!focused) return;
    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [focused, updateRect]);

  const saveSearch = (term) => {
    const clean = term.trim();
    if (!clean) return;
    setRecent((prev) => {
      const next = [clean, ...prev.filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) { /* ignore */ }
      return next;
    });
  };

  const removeRecent = (term) => {
    setRecent((prev) => {
      const next = prev.filter((s) => s !== term);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) { /* ignore */ }
      return next;
    });
  };

  // ── Click fuera cierra el dropdown ──
  useEffect(() => {
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setFocused(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ── Autocomplete local (tiempo real) ──
  const suggestions = useMemo(() => {
    const clean = value.trim().toLowerCase();
    if (!clean) return { products: [], bisnes: [] };

    const p = products
      .filter((prod) =>
        `${prod.name} ${prod.category} ${prod.description || ""} ${prod.promo || ""}`.toLowerCase().includes(clean)
      )
      .slice(0, MAX_PRODUCTS);

    const b = bisnes
      .filter((bisne) =>
        `${bisne.business_name} ${bisne.slogan || ""} ${bisne.category || ""}`.toLowerCase().includes(clean)
      )
      .slice(0, MAX_BISNES);

    return { products: p, bisnes: b };
  }, [value, products, bisnes]);

  const suggestionCount = suggestions.products.length + suggestions.bisnes.length;
  const showingRecent = !value.trim() && recent.length > 0;
  const showDropdown = focused && (showingRecent || suggestionCount > 0);

  const submit = () => {
    const term = value.trim();
    if (!term) return;
    saveSearch(term);
    setFocused(false);
    setHighlighted(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const all = [...suggestions.products, ...suggestions.bisnes];
      if (highlighted >= 0 && all[highlighted]) {
        e.preventDefault();
        const item = all[highlighted];
        if (item && item.business_name && item.handle) {
          window.location.href = `/b/${item.handle}`;
        } else if (item) {
          saveSearch(item.name);
          setFocused(false);
          setHighlighted(-1);
          onOpenProduct?.(item);
        }
      } else {
        submit();
      }
    } else if (e.key === "Escape") {
      setFocused(false);
      setHighlighted(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % Math.max(1, suggestionCount));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + Math.max(1, suggestionCount)) % Math.max(1, suggestionCount));
    }
  };

  const handleMouseDown = (idx) => {
    const all = [...suggestions.products, ...suggestions.bisnes];
    const item = all[idx];
    if (!item) return;
    if (item.business_name && item.handle) return; // es un bisne: navegar con Link
    saveSearch(item.name);
    setFocused(false);
    setHighlighted(-1);
    onOpenProduct?.(item);
  };

  const dropdown = showDropdown && portalEl && boxRect ? createPortal(
    <div
      className="gs-dropdown-portal"
      role="listbox"
      style={{
        position: "fixed",
        top: boxRect.top,
        left: boxRect.left,
        width: boxRect.width,
        maxHeight: Math.max(240, Math.min(boxRect.bottomGap - 16, 420)),
      }}
    >
      {showingRecent && (
        <div className="gs-recent">
          <div className="gs-dropdown-label">
            <span>Búsquedas frecuentes</span>
            <button type="button" className="gs-clear-recent" onClick={() => { setRecent([]); try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ } }}>
              Borrar
            </button>
          </div>
          {recent.map((term) => (
            <div key={term} className="gs-recent-row" onClick={() => { saveSearch(term); onChange(term); setHighlighted(-1); }}>
              <Icon name="clock" />
              <span className="gs-recent-term">{term}</span>
              <button
                type="button"
                className="gs-recent-remove"
                aria-label={`Quitar ${term}`}
                onClick={(e) => { e.stopPropagation(); removeRecent(term); }}
              >
                <Icon name="cross" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(suggestions.products.length > 0 || suggestions.bisnes.length > 0) && (
        <div className="gs-suggestions">
          {suggestions.products.length > 0 && (
            <>
              <div className="gs-dropdown-label">Productos</div>
              {suggestions.products.map((prod, i) => (
                <button
                  key={prod.id}
                  type="button"
                  className={`gs-suggestion${highlighted === i ? " highlighted" : ""}`}
                  onMouseDown={() => handleMouseDown(i)}
                  onMouseEnter={() => setHighlighted(i)}
                >
                  <span className="gs-suggestion-thumb">
                    <SafeImage src={prod.image} alt={prod.name} width={40} height={40} className="gs-suggestion-img" />
                  </span>
                  <span className="gs-suggestion-text">
                    <span className="gs-suggestion-name">{prod.name}</span>
                    <span className="gs-suggestion-meta">
                      {prod.category} · {prod.currencySymbol || "$"}{prod.priceUSD.toFixed(2)}
                    </span>
                  </span>
                  <Icon name="arrow-up" style={{ transform: "rotate(90deg)" }} />
                </button>
              ))}
            </>
          )}

          {suggestions.bisnes.length > 0 && (
            <>
              <div className="gs-dropdown-label">Bisnes</div>
              {suggestions.bisnes.map((bisne, i) => {
                const idx = suggestions.products.length + i;
                return (
                  <Link
                    key={bisne.id}
                    href={`/b/${bisne.handle}`}
                    className={`gs-suggestion gs-suggestion-bisne${highlighted === idx ? " highlighted" : ""}`}
                    onMouseEnter={() => setHighlighted(idx)}
                    onClick={() => setFocused(false)}
                  >
                    <span className="gs-suggestion-thumb bisne">
                      {bisne.logoUrl ? (
                        <SafeImage src={bisne.logoUrl} alt={bisne.business_name} width={40} height={40} className="gs-suggestion-img" />
                      ) : (
                        <Icon name="shopping-bag" size={16} />
                      )}
                    </span>
                    <span className="gs-suggestion-text">
                      <span className="gs-suggestion-name">
                        {bisne.business_name}
                        {bisne.verified && (
                          <span className="business-verified-badge" title="Verificado">
                            <Icon name="check" size={10} />
                          </span>
                        )}
                      </span>
                      <span className="gs-suggestion-meta">
                        {bisne.category} · {bisne.productCount} productos
                      </span>
                    </span>
                    <Icon name="arrow-up" style={{ transform: "rotate(90deg)" }} />
                  </Link>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>,
    portalEl
  ) : null;

  // ── Resultados en vivo (sección bajo el buscador, UI_UX.md §5.2) ──
  const liveProducts = value.trim().length >= 2 ? suggestions.products.slice(0, 8) : [];
  const liveBisnes = value.trim().length >= 2 ? suggestions.bisnes.slice(0, 4) : [];

  return (
    <div className="global-search" ref={rootRef}>
      <div className="global-search-hero">
        <h1 className="global-search-title">¿Qué buscas hoy?</h1>
        <p className="global-search-sub">Productos y bisnes de toda la comunidad elBisne.</p>
      </div>

      <div className="global-search-box" ref={boxRef}>
        <span className="search-icon">
          <Icon name="search" />
        </span>
        <input
          ref={inputRef}
          type="text"
          className="global-search-input"
          placeholder="Buscar productos, categorías, bisnes..."
          aria-label="Buscar en elBisne"
          value={value}
          onChange={(e) => { onChange(e.target.value); setHighlighted(-1); }}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
        />
        {value && (
          <button type="button" className="clear-search-btn" onClick={onClear} title="Limpiar" aria-label="Limpiar búsqueda">
            <Icon name="cross" />
          </button>
        )}
      </div>

      {dropdown}

      {!focused && !value.trim() && recent.length > 0 && (
        <div className="global-search-recent-chips">
          <span className="gs-chips-label">Pulsa una búsqueda anterior:</span>
          {recent.slice(0, 5).map((term) => (
            <button key={term} type="button" className="gs-chip" onClick={() => { saveSearch(term); onChange(term); }}>
              {term}
            </button>
          ))}
        </div>
      )}

      {/* Resultados en vivo: productos + bisnes (sin salir de la página) */}
      {value.trim().length >= 2 && (liveProducts.length > 0 || liveBisnes.length > 0) && (
        <div className="gs-live-results">
          {liveBisnes.length > 0 && (
            <div className="gs-live-bisnes">
              {liveBisnes.map((bisne) => (
                <div key={bisne.id} className="business-card business-card-new">
                  <Link href={`/b/${bisne.handle}`} className="business-card-main">
                    <div className="business-card-logo">
                      {bisne.logoUrl ? (
                        <SafeImage src={bisne.logoUrl} alt={bisne.business_name} fill sizes="80px" className="business-card-logo-img" />
                      ) : (
                        <span className="business-card-initial">{bisne.business_name?.charAt(0) || "B"}</span>
                      )}
                    </div>
                    <div className="business-card-info">
                      <span className="business-card-name">
                        {bisne.business_name}
                        {bisne.verified && (
                          <span className="business-verified-badge" title="Verificado">
                            <Icon name="check" />
                          </span>
                        )}
                      </span>
                      {bisne.slogan && <span className="business-card-slogan">{bisne.slogan}</span>}
                      <span className="business-card-meta">
                        {bisne.category && <span>{bisne.category}</span>}
                        <span>{bisne.productCount} productos</span>
                      </span>
                    </div>
                  </Link>
                  {followable && (
                    <div className="business-card-follow">
                      <FollowButton bisneId={bisne.id} size="sm" withLabel={false} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {liveProducts.length > 0 && (
            <div className="gs-live-products">
              <div className="gs-live-label">Productos que coinciden</div>
              {liveProducts.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  className="gs-live-product"
                  onClick={() => { saveSearch(prod.name); onOpenProduct?.(prod); }}
                >
                  <SafeImage src={prod.image} alt={prod.name} width={48} height={48} className="gs-live-product-img" />
                  <span className="gs-live-product-info">
                    <span className="gs-live-product-name">{prod.name}</span>
                    <span className="gs-live-product-meta">{prod.category} · ${prod.priceUSD.toFixed(2)}</span>
                  </span>
                  <Icon name="arrow-up" style={{ transform: "rotate(90deg)" }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
