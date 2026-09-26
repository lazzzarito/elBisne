"use client";

import { useEffect } from "react";
import Link from "next/link";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useHistoryPopup } from "@/lib/use-history-popup";
import Icon from "@/components/Icon";

// Menú de gestión (avanzado) del dueño desde el propio perfil. La edición
// rápida vive inline en la página; aquí van las herramientas completas.
const OPTIONS = [
  { href: "/panel", label: "Estadísticas y resumen", icon: "explore" },
  { href: "/panel/productos", label: "Gestión de productos", icon: "shopping-bag" },
  { href: "/panel/pedidos", label: "Pedidos", icon: "cart" },
  { href: "/panel/apariencia", label: "Apariencia avanzada", icon: "sparkles" },
  { href: "/panel/verificacion", label: "Verificación", icon: "shield" },
];

const PERSONAL_OPTIONS = [
  { href: "/panel/productos", label: "Publicar y gestionar productos", icon: "shopping-bag" },
  { href: "/panel/pedidos", label: "Pedidos", icon: "cart" },
];

export default function StoreOwnerMenu({ open, handle, onClose, isPersonal = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const unlock = lockBodyScroll();
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      unlock();
    };
  }, [open, onClose]);

  useHistoryPopup(open, onClose);

  // El cajón global vive en GlobalDrawers; se le avisa por el mismo bus de
  // CustomEvent que usa el resto del chrome. El menú se cierra antes para no
  // dejar dos capas superpuestas.
  const openCartFromMenu = () => {
    onClose?.();
    window.dispatchEvent(new CustomEvent("open-cart"));
  };

  if (!open) return null;

  return (
    <div className="store-owner-menu-overlay" onClick={onClose}>
      <div className="store-owner-menu" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Gestión de la tienda">
        <div className="store-owner-menu-handle" aria-hidden="true" />
        <h2 className="store-owner-menu-title">{isPersonal ? "Gestión de mi perfil" : "Gestión de mi tienda"}</h2>
        <div className="store-owner-menu-list">
          {/* En la página del propio bisne el FAB es el de publicar producto y
              la cabecera no lleva carrito, así que el carrito del dueño se abre
              desde aquí. */}
          <button type="button" className="store-owner-menu-item" onClick={openCartFromMenu}>
            <Icon name="cart" size={16} />
            <span>Mi carrito</span>
            <Icon name="chevron-right" size={14} />
          </button>
          {(isPersonal ? PERSONAL_OPTIONS : OPTIONS).map((opt) => (
            <Link key={opt.href} href={opt.href} className="store-owner-menu-item" onClick={onClose}>
              <Icon name={opt.icon} size={16} />
              <span>{opt.label}</span>
              <Icon name="chevron-right" size={14} />
            </Link>
          ))}
          {handle && (
            <Link href={`/${handle}`} className="store-owner-menu-item" onClick={onClose}>
              <Icon name="eye" size={16} />
              <span>Ver mi tienda</span>
              <Icon name="chevron-right" size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
