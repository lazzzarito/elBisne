"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useHistoryPopup } from "@/lib/use-history-popup";
import { useEffect } from "react";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";

// Popup de publicidad (UI_UX.md §4.1): mismo formato que la ficha de producto
// pero con botón "Visitar enlace" en vez de comprar. El enlace apunta a un
// perfil de bisne (/b/handle) o a una URL externa.
export default function AdPopup({ promo, onClose }) {
  useEffect(() => {
    if (!promo) return undefined;
    const unlock = lockBodyScroll();
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      unlock();
    };
  }, [promo, onClose]);

  useHistoryPopup(!!promo, onClose);

  if (!promo) return null;

  // El enlace nunca deja al usuario en un callejón sin salida:
  //  · bisne → perfil del bisne
  //  · url con enlace → enlace externo
  //  · url sin enlace pero con bisne_handle → perfil del bisne (fallback)
  //  · sin nada → Explorar (siempre hay salida)
  const isBisne = (promo.link_type === "bisne" && promo.bisne_handle) ||
    (promo.link_type === "url" && !promo.link_url && promo.bisne_handle);
  const hasAnyTarget = isBisne || promo.link_url;

  return createPortal(
    <div className="store-info-overlay" onClick={onClose}>
      <div className="ad-popup" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={promo.title || "Publicidad"}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <Icon name="close" size={18} />
        </button>

        <div className="ad-popup-image">
          <SafeImage
            src={promo.image_url}
            alt={promo.title || "Promoción"}
            width={640}
            height={360}
            className="ad-popup-img"
            sizes="(max-width: 560px) 100vw, 480px"
          />
        </div>

        <div className="ad-popup-body">
          <span className="ad-popup-tag">Promoción</span>
          <h2 className="ad-popup-title">{promo.title || "Te puede interesar"}</h2>
          {promo.subtitle && <p className="ad-popup-subtitle">{promo.subtitle}</p>}

          {isBisne && (promo.bisne_handle || promo.link_url) ? (
            <Link href={`/b/${promo.bisne_handle || ""}`} className="ad-popup-cta" onClick={onClose}>
              <Icon name="shopping-bag" size={16} />
              Visitar enlace
            </Link>
          ) : promo.link_url ? (
            <a href={promo.link_url} target="_blank" rel="noopener noreferrer" className="ad-popup-cta">
              <Icon name="arrow-up" size={16} style={{ transform: "rotate(45deg)" }} />
              Visitar enlace
            </a>
          ) : !hasAnyTarget ? (
            <Link href="/explorar" className="ad-popup-cta" onClick={onClose}>
              <Icon name="explore" size={16} />
              Explorar bisnes
            </Link>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
