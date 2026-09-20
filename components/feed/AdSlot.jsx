"use client";

import { useState } from "react";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";
import AdPopup from "./AdPopup";

// Slot publicitario (UI_UX.md §8): imagen + enlace gestionado desde /admin.
// Fallback SIEMPRE disponible: si no hay anuncio activo para este slot,
// muestra una promo propia del sitio (site_promos) — el slot nunca queda vacío.
export default function AdSlot({ ad, fallbackPromo, position = "top" }) {
  const [selected, setSelected] = useState(null);

  // Anuncio pagado → enlace directo (no popup); promo propia → popup
  if (ad) {
    return (
      <a
        href={ad.link_url || "#"}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={`ad-slot ad-slot-${position}`}
        aria-label={ad.title || "Publicidad"}
      >
        <SafeImage
          src={ad.image_url}
          alt={ad.title || "Publicidad"}
          fill
          sizes="(max-width: 768px) 100vw, 900px"
          className="ad-slot-img"
        />
        <span className="ad-slot-tag">Publicidad</span>
      </a>
    );
  }

  if (fallbackPromo) {
    return (
      <>
        <button
          type="button"
          className={`ad-slot ad-slot-${position} ad-slot-promo`}
          onClick={() => setSelected(fallbackPromo)}
          aria-label={fallbackPromo.title || "Promoción del sitio"}
        >
          <SafeImage
            src={fallbackPromo.image_url}
            alt={fallbackPromo.title || "Promoción del sitio"}
            fill
            sizes="(max-width: 768px) 100vw, 900px"
            className="ad-slot-img"
          />
          <span className="ad-slot-tag">Promocionado</span>
          <span className="ad-slot-overlay">
            <Icon name="sparkles" size={14} />
            <span>{fallbackPromo.title || "Te puede interesar"}</span>
          </span>
        </button>
        <AdPopup promo={selected} onClose={() => setSelected(null)} />
      </>
    );
  }

  return null;
}
