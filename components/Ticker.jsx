"use client";

import { useLayoutEffect, useRef, useState } from "react";

// Texto con marquee
// Detecta si el contenido desborda su contenedor y, si es así, aplica un
// desplazamiento horizontal infinito (tipo reproductor de música). Si cabe,
// se muestra quieto y con tooltip. La velocidad escala con el largo.
export default function Ticker({ children, className = "", title = "" }) {
  const [isMarquee, setIsMarquee] = useState(false);
  const [duration, setDuration] = useState(12);
  const contentRef = useRef(null);
  const boxRef = useRef(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const inner = contentRef.current;
      if (!inner) return;
      // getBoundingClientRect en vez de scrollWidth: da el ancho real con
      // decimales y no redondea, que es lo que decidía si el texto entraba.
      const w = inner.getBoundingClientRect().width;
      if (w === 0) return;
      setIsMarquee(w > box.clientWidth + 2);
      setDuration(Math.max(8, Math.round(w / 55)));
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    // Se observan la caja Y el contenido. Observar solo la caja no detectaba
    // que el texto cambiase de ancho, así que una categoría larga se quedaba
    // sin slide aunque desbordase.
    if (ro) {
      ro.observe(box);
      if (contentRef.current) ro.observe(contentRef.current);
    }
    // La etiqueta va en mayúsculas con letter-spacing: si se mide antes de que
    // cargue la tipografía, el ancho sale corto y el marquee no se activa.
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      if (ro) ro.disconnect();
    };
  }, [children]);

  return (
    <span className={`ticker${isMarquee ? " marquee" : ""} ${className}`} ref={boxRef} title={title || undefined}>
      <span className="ticker-track" style={isMarquee ? { animationDuration: `${duration}s` } : undefined}>
        <span className="ticker-content" ref={contentRef}>{children}</span>
        {isMarquee && (
          <span className="ticker-content" aria-hidden="true">{children}</span>
        )}
      </span>
    </span>
  );
}