"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Carrusel de banners reutilizable ────────────────────────────────────
// scroll-snap horizontal con autoplay, arrastre con ratón (desktop) y
// toque nativo (mobile). Detecta clic accidental tras arrastrar y lo
// suprime. Los puntos se superponen sobre las diapositivas (según CSS).
export default function BannerCarousel({
  slides = [],
  autoplayMs = 4000,
  className = "",
  trackClassName = "",
  itemClassName = "",
  showDots = true,
  ariaLabel = "Carrusel de banners",
}) {
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0, moved: 0 });
  const pausedRef = useRef(false);

  const total = slides.length;
  const hasOptions = total > 1;

  const goTo = useCallback(
    (i) => {
      const el = trackRef.current;
      if (!el) return;
      const safe = (i + total) % total;
      el.scrollTo({ left: safe * el.clientWidth, behavior: "smooth" });
    },
    [total]
  );

  const syncIndex = () => {
    const el = trackRef.current;
    if (!el) return;
    setIndex(Math.max(0, Math.round(el.scrollLeft / el.clientWidth)));
  };

  useEffect(() => {
    syncIndex();
  }, [total]);

  useEffect(() => {
    if (!hasOptions || !autoplayMs) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const el = trackRef.current;
      if (!el) return;
      const next = Math.round(el.scrollLeft / el.clientWidth) + 1;
      if (next >= total) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
      }
    }, autoplayMs);
    return () => clearInterval(id);
  }, [hasOptions, autoplayMs, total]);

  const onPointerDown = (e) => {
    if (e.pointerType !== "mouse") return;
    const el = trackRef.current;
    if (!el) return;
    dragRef.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: 0 };
    pausedRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    const el = trackRef.current;
    if (!d.active || e.pointerType !== "mouse" || !el) return;
    const delta = e.clientX - d.startX;
    d.moved = delta;
    el.scrollLeft = d.startScroll - delta;
  };

  const endDrag = () => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setTimeout(() => {
      pausedRef.current = false;
    }, 1200);
  };

  const suppressDragClick = (e) => {
    if (Math.abs(dragRef.current.moved) > 6) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = 0;
    }
  };

  if (!hasOptions) {
    return (
      <div className={`banner-carousel${className ? ` ${className}` : ""} banner-carousel-single`}>
        <div className={`banner-carousel-track${trackClassName ? ` ${trackClassName}` : ""}`}>
          <div className={`banner-carousel-item${itemClassName ? ` ${itemClassName}` : ""}`}>{slides[0]}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`banner-carousel${className ? ` ${className}` : ""}`}
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div
        ref={trackRef}
        className={`banner-carousel-track${trackClassName ? ` ${trackClassName}` : ""}`}
        onScroll={syncIndex}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={endDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={suppressDragClick}
        aria-label={ariaLabel}
        role="region"
      >
        {slides.map((node, i) => (
          <div className={`banner-carousel-item${itemClassName ? ` ${itemClassName}` : ""}`} key={i}>
            {node}
          </div>
        ))}
      </div>

      {showDots && (
        <div className="banner-carousel-dots" role="tablist" aria-label="Navegación del carrusel">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              className={`banner-carousel-dot${i === index ? " active" : ""}`}
              onClick={() => goTo(i)}
              aria-selected={i === index}
              aria-label={`Ir a la diapositiva ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}