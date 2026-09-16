"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";

const MAX_SUGGESTIONS = 6;
const STORAGE_KEY = "elbisne_recent_searches";

export default function GlobalSearch({ products, bisnes, value, onChange, onOpenProduct, onClear }) {
  const [focused, setFocused] = useState(false);
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
  const inputRef = useRef(null);

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

  // ── Click fuera del componente cierra el dropdown ──
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
      .slice(0, MAX_SUGGESTIONS);

    const b = bisnes
      .filter((bisne) =>
        `${bisne.business_name} ${bisne.slogan || ""} ${bisne.category || ""}`.toLowerCase().includes(clean)
      )
      .slice(0, 4);

    return { products: p, bisnes: b };
  }, [value, products, bisnes]);

  const suggestionCount = suggestions.products.length + suggestions.bisnes.length;
  const showingRecent = !value.trim() && recent.length > 0;

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
          // es un bisne: dejamos que el usuario navegue con Enter hacia /b/[handle]
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

  return (
    <div className="global-search" ref={rootRef}>
      <div className="global-search-hero">
        <h1 className="global-search-title">¿Qué buscas hoy?</h1>
        <p className="global-search-sub">Productos y bisnes de toda la comunidad elBisne.</p>
      </div>

      <div className="global-search-box">
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

      {focused && (showingRecent || suggestionCount > 0) && (
        <div className="global-search-dropdown" role="listbox">
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
                  <div className="gs-dropdown-label" style={{ marginTop: "0.5rem" }}>Bisnes</div>
                  {suggestions.bisnes.map((bisne, i) => {
                    const idx = suggestions.products.length + i;
                    return (
                      <Link
                        key={bisne.id}
                        href={`/b/${bisne.handle}`}
                        className={`gs-suggestion${highlighted === idx ? " highlighted" : ""}`}
                        onMouseEnter={() => setHighlighted(idx)}
                      >
                        <span className="gs-suggestion-thumb">
                          <Icon name="map-pin" />
                        </span>
                        <span className="gs-suggestion-text">
                          <span className="gs-suggestion-name">{bisne.business_name}</span>
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
        </div>
      )}

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
    </div>
  );
}