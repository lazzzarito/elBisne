"use client";

import { useEffect, useMemo, useRef, useState, startTransition } from "react";
import MasonryGrid from "@/components/MasonryGrid";
import ProductCard from "@/components/ProductCard";
import Icon from "@/components/Icon";
import FeedBusinessCard from "@/components/feed/FeedBusinessCard";
import { buildMixedFeed, countMixedFeed, PRODUCTS_PER_BUSINESS } from "@/lib/feed-mix";
import { plural } from "@/lib/text";

// ── Feed tipo red social: productos + bisnes mezclados, sin repetir ──────
// El catálogo ya viene entero desde el RSC (app/page.js), así que aquí no hay
// paginación de red: el feed se arma en memoria y se va pintando de a bloques.
//
// El catálogo NO se recicla (antes sí). Cada producto y cada bisne aparece
// una sola vez, así que el feed tiene un final real: en vez de un loader
// girando para siempre, cerramos con "ya viste todo" + un botón que reordena
// con otra semilla.
//
// Clave de UX: la carga se dispara con un rootMargin generoso para que el
// contenido esté en el DOM ~900px ANTES de que el sentinel entre en pantalla.
// El scroll nunca llega a "tirar de la carga".
const PAGE_SIZE = 20;          // ≈ 1 bloque de 15 productos + 1 bisne
const PREFETCH_MARGIN = 900;   // px de anticipación antes de que se vea el sentinel
const RELOAD_COOLDOWN = 400;   // ms mínimo entre cargas (evita cascadas de append)
const STAGGER_STEP = 6;        // ciclo del stagger para que items viejos no esperen segundos
const INITIAL_SEED = 0x1f2e3d4c; // fijo: servidor y cliente deben coincidir (hydration)

export default function DiscoverFeed({
  products,
  bisnes,
  onAddToCart,
  onOpenDetails,
  favoriteIds,
  onToggleFavorite,
  showBisne = false,
  bisneMap,
  title = "Descubre más Productos",
  subtitle = "Explora un sin fin de ofertas y productos solo para ti.",
  productsPerBusiness = PRODUCTS_PER_BUSINESS,
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Sólo cambia al pulsar "Ver otra vez": la primera pasada va con semilla fija
  // para que el HTML de servidor y el del cliente coincidan.
  const [seed, setSeed] = useState(INITIAL_SEED);
  const sentinelRef = useRef(null);
  const lastLoadRef = useRef(0);

  // Tope real del feed: productos + bisnes. Nunca hay más items que esto.
  const total = useMemo(() => countMixedFeed({ products, bisnes }), [products, bisnes]);

  const items = useMemo(
    () =>
      buildMixedFeed({
        products,
        bisnes,
        count: Math.min(visibleCount, total),
        productsPerBusiness,
        seed,
      }),
    [products, bisnes, visibleCount, total, productsPerBusiness, seed]
  );

  const hasMore = visibleCount < total;

  // Depende de visibleCount a propósito: re-observar tras cada append fuerza
  // al navegador a re-evaluar la intersección, así el feed nunca se queda
  // trabado si el sentinel sigue dentro del margen.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        const now = Date.now();
        if (now - lastLoadRef.current < RELOAD_COOLDOWN) return;
        lastLoadRef.current = now;
        // rAF + startTransition: el append no congela el hilo ni bloquea el scroll.
        requestAnimationFrame(() => {
          startTransition(() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, total)));
        });
      },
      { threshold: 0, rootMargin: `${PREFETCH_MARGIN}px 0px` }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, total]);

  // "Ver otra vez": mismo catálogo, otro orden. Math.random() es seguro acá
  // porque ocurre en un click, nunca durante el render.
  const restart = () => {
    lastLoadRef.current = 0;
    startTransition(() => {
      setSeed(Math.floor(Math.random() * 0xffffffff));
      setVisibleCount(PAGE_SIZE);
    });
  };

  if (!items.length) return null;

  return (
    <section className="discover-feed" aria-label={title}>
      <h2 className="featured-title">{title}</h2>
      {subtitle && <p className="section-subtitle">{subtitle}</p>}

      <MasonryGrid key="home-discover">
        {items.map((entry, i) =>
          entry.kind === "bisne" ? (
            <FeedBusinessCard key={`bisne-${i}`} bisne={entry.item} index={i % STAGGER_STEP} />
          ) : (
            <ProductCard
              key={`product-${i}`}
              product={entry.item}
              onAddToCart={onAddToCart}
              onOpenDetails={onOpenDetails}
              isFavorited={favoriteIds.includes(entry.item.id)}
              onToggleFavorite={onToggleFavorite}
              priority={i < 4}
              index={i % STAGGER_STEP}
              showBisne={showBisne}
              bisneInfo={bisneMap?.get(entry.item.bisneId)}
            />
          )
        )}
      </MasonryGrid>

      {hasMore ? (
        <div ref={sentinelRef} className="infinite-scroll-trigger" aria-hidden="true">
          <div className="dot-loader">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        </div>
      ) : (
        <div className="discover-feed-end">
          <span className="discover-feed-end-badge">
            <Icon name="check" />
          </span>
          <p className="discover-feed-end-title">Ya viste todo el catálogo</p>
          <p className="discover-feed-end-sub">
            {plural(products?.length || 0, "producto", "productos")} de {plural(bisnes?.length || 0, "tienda", "tiendas")},
            todo sin repetidos.
          </p>
          <button type="button" className="discover-feed-end-btn" onClick={restart}>
            <Icon name="refresh" />
            Ver otra vez
          </button>
        </div>
      )}
    </section>
  );
}
